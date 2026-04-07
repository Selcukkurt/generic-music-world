import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import { buildGmwDarkCardEmailHtml } from "@/lib/email/gmwTransactionalEmail";
import { generateIpPdf } from "@/lib/pdf/generateIpPdf";
import { generateNDAPdf } from "@/lib/pdf/generateNDA";
import { Resend } from "resend";

const NDA_FLOW_LOG = "[nda-accept-flow]";
/** Log interval while PDF is generating — does not cancel Puppeteer; surfaces stalls/hangs. */
const PDF_STALL_LOG_INTERVAL_MS = 25_000;

const CONTRACTS_BUCKET = "contracts";
const NDA_OBJECT_PATH = (userId: string) => `generated/${userId}/nda_v1.pdf`;
const IP_OBJECT_PATH = (userId: string) => `generated/${userId}/ip_v1.pdf`;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

export type AgreementLegResult = {
  pdf_generated: boolean;
  storage_uploaded: boolean;
  storagePath?: string;
};

export type NdaLegResult = AgreementLegResult & {
  signed_url_created: boolean;
  signedUrl?: string;
};

async function loadAppUserDisplayName(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string ): Promise<string> {
  const { data, error } = await supabase
    .from("app_users")
    .select("full_name, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[finalizeNdaAcceptanceDelivery] app_users read:", error.message);
  }

  const row = data as {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;

  const full = row?.full_name?.trim();
  if (full) return full;

  const combined = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  if (combined) return combined;

  const local = fallbackEmail.split("@")[0]?.trim();
  return local || "Kullanıcı";
}

export type FinalizeNdaAcceptanceDeliveryInput = {
  userId: string;
  email: string;
  clientIp: string;
  acceptedAtIso: string;
  agreementVersion: string;
  /** When true (e.g. onboarding completion), also generate IP PDF, upload, and attach both. Default false for NDA-only API paths. */
  includeIntellectualPropertyPdf?: boolean;
  /** Defaults to `AGREEMENT_VERSIONS.intellectual_property` when `includeIntellectualPropertyPdf` is true. */
  ipAgreementVersion?: string;
};

/** Temporary onboarding delivery pipeline observability. */
export type DebugNdaDeliveryPayload = {
  reachedFinalizeNdaAcceptanceDelivery: boolean;
  /** NDA PDF size */
  pdfByteLength: number | null;
  /** IP PDF size (null when IP leg skipped) */
  ipPdfByteLength: number | null;
  storageUploadAttempted: boolean;
  storageUploadSucceeded: boolean;
  ipStorageUploadAttempted: boolean;
  ipStorageUploadSucceeded: boolean;
  storageVerifyWarning: boolean;
  ipStorageVerifyWarning: boolean;
  emailAttempted: boolean;
  emailSkipped: boolean;
  resendSucceeded: boolean;
  resendErrorMessage: string | null;
};

function mergeDebugNdaDelivery(p: Partial<DebugNdaDeliveryPayload>): DebugNdaDeliveryPayload {
  return {
    reachedFinalizeNdaAcceptanceDelivery: p.reachedFinalizeNdaAcceptanceDelivery ?? true,
    pdfByteLength: p.pdfByteLength ?? null,
    ipPdfByteLength: p.ipPdfByteLength ?? null,
    storageUploadAttempted: p.storageUploadAttempted ?? false,
    storageUploadSucceeded: p.storageUploadSucceeded ?? false,
    ipStorageUploadAttempted: p.ipStorageUploadAttempted ?? false,
    ipStorageUploadSucceeded: p.ipStorageUploadSucceeded ?? false,
    storageVerifyWarning: p.storageVerifyWarning ?? false,
    ipStorageVerifyWarning: p.ipStorageVerifyWarning ?? false,
    emailAttempted: p.emailAttempted ?? false,
    emailSkipped: p.emailSkipped ?? true,
    resendSucceeded: p.resendSucceeded ?? false,
    resendErrorMessage: p.resendErrorMessage ?? null,
  };
}

export type FinalizeNdaAcceptanceDeliveryResult = {
  nda: NdaLegResult;
  ip: AgreementLegResult;
  email_sent: boolean;
  success: boolean;
  error?: string;
  debugNdaDelivery?: DebugNdaDeliveryPayload;
};

function emptyIpLeg(): AgreementLegResult {
  return { pdf_generated: false, storage_uploaded: false };
}

function emptyNdaLeg(): NdaLegResult {
  return { pdf_generated: false, storage_uploaded: false, signed_url_created: false };
}

/** IP leg is informational only; success requires NDA + email (signed URL as today). */
function deliverySuccess(nda: NdaLegResult, email_sent: boolean): boolean {
  const ndaOk =
    nda.pdf_generated && nda.storage_uploaded && nda.signed_url_created;
  return ndaOk && email_sent;
}

function finalizeSuccess(args: {
  nda: NdaLegResult;
  ip: AgreementLegResult;
  email_sent: boolean;
  error?: string;
  debugNdaDelivery?: DebugNdaDeliveryPayload;
  includeIp: boolean;
}): FinalizeNdaAcceptanceDeliveryResult {
  const { includeIp: _includeIp, debugNdaDelivery, ...rest } = args;
  const success = deliverySuccess(rest.nda, rest.email_sent);
  return { ...rest, success, ...(debugNdaDelivery ? { debugNdaDelivery } : {}) };
}

export function ndaDeliveryResponseFields(
  outcome: FinalizeNdaAcceptanceDeliveryResult | undefined,
  logLabel: string
): Record<string, unknown> {
  if (!outcome) return {};
  if (!outcome.success) {
    console.error(`${logLabel} agreement e-mail delivery incomplete`, {
      error: outcome.error,
      nda: outcome.nda,
      ip: outcome.ip,
      email_sent: outcome.email_sent,
    });
  }
  return {
    nda: {
      delivered: outcome.success,
      pdf_generated: outcome.nda.pdf_generated,
      storage_uploaded: outcome.nda.storage_uploaded,
      signed_url_created: outcome.nda.signed_url_created,
      email_sent: outcome.email_sent,
      ...(outcome.nda.storagePath ? { storagePath: outcome.nda.storagePath } : {}),
      ...(outcome.nda.signedUrl ? { signedUrl: outcome.nda.signedUrl } : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
    },
    ip: {
      pdf_generated: outcome.ip.pdf_generated,
      storage_uploaded: outcome.ip.storage_uploaded,
      ...(outcome.ip.storagePath ? { storagePath: outcome.ip.storagePath } : {}),
    },
    email_sent: outcome.email_sent,
  };
}

/**
 * After agreement(s) recorded: PDF(s) → Supabase Storage → signed URL (NDA) → Resend e-mail with attachment(s).
 * Does not throw; returns per-stage flags. Use `includeIntellectualPropertyPdf` for onboarding-complete (both PDFs).
 */
export async function finalizeNdaAcceptanceDelivery(
  input: FinalizeNdaAcceptanceDeliveryInput
): Promise<FinalizeNdaAcceptanceDeliveryResult> {
  const includeIp = Boolean(input.includeIntellectualPropertyPdf);
  const ipVersion =
    input.ipAgreementVersion ?? AGREEMENT_VERSIONS[AGREEMENT_KEYS.intellectual_property];

  console.log("FINALIZE NDA DELIVERY START");
  console.info("[nda-email-debug] finalizeNdaAcceptanceDelivery started", {
    userId: input.userId,
    recipientEmail: input.email?.trim() ?? null,
    includeIntellectualPropertyPdf: includeIp,
  });
  try {
    return await runNdaAcceptanceDelivery(input, includeIp, ipVersion);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[finalizeNdaAcceptanceDelivery] unexpected:", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      emailSkipped: true,
      resendErrorMessage: msg,
    });
    console.info("[debugNdaDelivery]", { stage: "finalize_throw", debugNdaDelivery });
    return finalizeSuccess({
      nda: emptyNdaLeg(),
      ip: emptyIpLeg(),
      email_sent: false,
      error: msg,
      debugNdaDelivery,
      includeIp,
    });
  }
}

async function runNdaAcceptanceDelivery(
  input: FinalizeNdaAcceptanceDeliveryInput,
  includeIp: boolean,
  ipVersion: string
): Promise<FinalizeNdaAcceptanceDeliveryResult> {
  const email = input.email?.trim();
  if (!email) {
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      emailSkipped: true,
      resendErrorMessage: "Missing user email for NDA delivery",
    });
    console.info("[debugNdaDelivery]", { stage: "no_recipient_email", debugNdaDelivery });
    return finalizeSuccess({
      nda: emptyNdaLeg(),
      ip: emptyIpLeg(),
      email_sent: false,
      error: "Missing user email for NDA delivery",
      debugNdaDelivery,
      includeIp,
    });
  }

  console.info(`${NDA_FLOW_LOG} 3. finalizeNdaAcceptanceDelivery started`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      emailSkipped: true,
      resendErrorMessage:
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for NDA storage",
    });
    console.info("[debugNdaDelivery]", { stage: "storage_env_missing", debugNdaDelivery });
    return finalizeSuccess({
      nda: emptyNdaLeg(),
      ip: emptyIpLeg(),
      email_sent: false,
      error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for NDA storage",
      debugNdaDelivery,
      includeIp,
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const fullName = await loadAppUserDisplayName(supabaseAdmin, input.userId, email);

  const date = input.acceptedAtIso.slice(0, 10);
  let pdfBuffer: Buffer;
  const pdfWaitStarted = Date.now();
  const pdfStallTimer = setInterval(() => {
    console.warn(`${NDA_FLOW_LOG} PDF generation still running (fail-fast diagnostic)`, {
      elapsedMs: Date.now() - pdfWaitStarted,
      nextLogInMs: PDF_STALL_LOG_INTERVAL_MS,
    });
  }, PDF_STALL_LOG_INTERVAL_MS);
  try {
    console.log("STEP PDF START");
    pdfBuffer = await generateNDAPdf({
      full_name: fullName,
      email,
      ip_address: input.clientIp,
      accepted_at: input.acceptedAtIso,
      date,
      agreement_version: input.agreementVersion,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[finalizeNdaAcceptanceDelivery] PDF generation:", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength: null,
      emailSkipped: true,
      resendErrorMessage: `NDA PDF generation failed: ${msg}`,
    });
    console.info("[debugNdaDelivery]", { stage: "pdf_failed", debugNdaDelivery });
    return finalizeSuccess({
      nda: emptyNdaLeg(),
      ip: emptyIpLeg(),
      email_sent: false,
      error: `NDA PDF generation failed: ${msg}`,
      debugNdaDelivery,
      includeIp,
    });
  } finally {
    clearInterval(pdfStallTimer);
  }

  const pdfByteLength = pdfBuffer.length;
  console.info("[debugNdaDelivery]", {
    stage: "pdf_ok",
    pdfByteLength,
  });

  const storagePath = NDA_OBJECT_PATH(input.userId);
  console.info(`${NDA_FLOW_LOG} 6. storage upload started`, { storagePath, bucket: CONTRACTS_BUCKET });
  console.log("STEP UPLOAD START");
  const { error: uploadError } = await supabaseAdmin.storage.from(CONTRACTS_BUCKET).upload(storagePath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    const msg = `NDA storage upload failed: ${uploadError.message}`;
    console.error("[finalizeNdaAcceptanceDelivery]", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength,
      storageUploadAttempted: true,
      storageUploadSucceeded: false,
      emailSkipped: true,
      resendErrorMessage: msg,
    });
    console.info("[debugNdaDelivery]", { stage: "storage_upload_failed", debugNdaDelivery });
    return finalizeSuccess({
      nda: { pdf_generated: true, storage_uploaded: false, storagePath, signed_url_created: false },
      ip: emptyIpLeg(),
      email_sent: false,
      error: msg,
      debugNdaDelivery,
      includeIp,
    });
  }

  console.info(`${NDA_FLOW_LOG} 7. storage upload finished`, { storagePath });

  let storageVerifyWarning = false;
  {
    const { data: verifyBlob, error: downloadErr } = await supabaseAdmin.storage
      .from(CONTRACTS_BUCKET)
      .download(storagePath);
    let verifyBytes = 0;
    if (verifyBlob) {
      try {
        verifyBytes = (await verifyBlob.arrayBuffer()).byteLength;
      } catch {
        verifyBytes = 0;
      }
    }
    console.info("[finalizeNdaAcceptanceDelivery] STORAGE_VERIFY_DOWNLOAD", {
      storagePath,
      success: !downloadErr && verifyBytes > 0,
      downloadError: downloadErr?.message ?? null,
      downloadedByteLength: verifyBytes,
    });
    storageVerifyWarning = Boolean(downloadErr || verifyBytes === 0);
    if (downloadErr || verifyBytes === 0) {
      console.warn("[finalizeNdaAcceptanceDelivery] STORAGE_VERIFY_DOWNLOAD_WARN", {
        storagePath,
        downloadErr: downloadErr?.message ?? null,
        verifyBytes,
        note: "Upload succeeded — continuing",
      });
    }
  }

  let ipBuffer: Buffer | undefined;
  let ipPdfByteLength: number | null = null;
  let ipStoragePath: string | undefined;
  let ipStorageVerifyWarning = false;
  let ipPdfGenerated = false;
  let ipStorageUploaded = false;
  let ipStorageUploadAttempted = false;

  if (includeIp) {
    ipStoragePath = IP_OBJECT_PATH(input.userId);
    try {
      console.log("STEP IP PDF START");
      ipBuffer = await generateIpPdf({
        full_name: fullName,
        email,
        ip_address: input.clientIp,
        accepted_at: input.acceptedAtIso,
        date,
        agreement_version: ipVersion,
      });
      ipPdfGenerated = true;
      ipPdfByteLength = ipBuffer.length;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[finalizeNdaAcceptanceDelivery] IP PDF generation failed (non-blocking, NDA e-mail continues):", msg);
      ipBuffer = undefined;
      ipPdfGenerated = false;
      ipPdfByteLength = null;
      console.info("[debugNdaDelivery]", { stage: "ip_pdf_failed_non_blocking", error: msg });
    }

    if (ipPdfGenerated && ipBuffer && ipStoragePath) {
      ipStorageUploadAttempted = true;
      console.info(`${NDA_FLOW_LOG} 6b. IP storage upload started`, { storagePath: ipStoragePath, bucket: CONTRACTS_BUCKET });
      const { error: ipUploadErr } = await supabaseAdmin.storage
        .from(CONTRACTS_BUCKET)
        .upload(ipStoragePath, ipBuffer, { contentType: "application/pdf", upsert: true });

      if (ipUploadErr) {
        const msg = `IP storage upload failed: ${ipUploadErr.message}`;
        console.error("[finalizeNdaAcceptanceDelivery] IP upload failed (non-blocking, NDA e-mail continues):", msg);
        ipStorageUploaded = false;
        console.info("[debugNdaDelivery]", { stage: "ip_storage_upload_failed_non_blocking", error: msg });
      } else {
        ipStorageUploaded = true;
        console.info(`${NDA_FLOW_LOG} 7b. IP storage upload finished`, { storagePath: ipStoragePath });

        const { data: verifyBlob, error: downloadErr } = await supabaseAdmin.storage
          .from(CONTRACTS_BUCKET)
          .download(ipStoragePath);
        let verifyBytes = 0;
        if (verifyBlob) {
          try {
            verifyBytes = (await verifyBlob.arrayBuffer()).byteLength;
          } catch {
            verifyBytes = 0;
          }
        }
        console.info("[finalizeNdaAcceptanceDelivery] IP_STORAGE_VERIFY_DOWNLOAD", {
          storagePath: ipStoragePath,
          success: !downloadErr && verifyBytes > 0,
          downloadError: downloadErr?.message ?? null,
          downloadedByteLength: verifyBytes,
        });
        ipStorageVerifyWarning = Boolean(downloadErr || verifyBytes === 0);
        if (downloadErr || verifyBytes === 0) {
          console.warn("[finalizeNdaAcceptanceDelivery] IP_STORAGE_VERIFY_DOWNLOAD_WARN", {
            storagePath: ipStoragePath,
            downloadErr: downloadErr?.message ?? null,
            verifyBytes,
            note: "Upload succeeded — continuing",
          });
        }
      }
    }
  }

  const ipAttachedToEmail = ipPdfGenerated && ipStorageUploaded;

  let signedUrl: string | undefined;
  console.info(`${NDA_FLOW_LOG} 8. signed URL started`, { storagePath });
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (signError || !signed?.signedUrl) {
    const msg = signError?.message ?? "NDA signed URL failed";
    console.error("[finalizeNdaAcceptanceDelivery] signed URL:", msg);
    signedUrl = undefined;
  } else {
    signedUrl = signed.signedUrl;
  }

  console.info(`${NDA_FLOW_LOG} 9. signed URL finished`, {
    created: Boolean(signedUrl),
    error: signError?.message,
  });

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? process.env.RESEND_FROM;
  if (!apiKey || !fromAddress) {
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength,
      ipPdfByteLength: includeIp ? ipPdfByteLength : null,
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      ipStorageUploadAttempted,
      ipStorageUploadSucceeded: ipStorageUploaded,
      ipStorageVerifyWarning,
      emailSkipped: true,
      resendErrorMessage:
        "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set for NDA confirmation e-mail (storage upload completed).",
    });
    console.info("[debugNdaDelivery]", { stage: "email_skipped_resend_config", debugNdaDelivery });
    return finalizeSuccess({
      nda: {
        pdf_generated: true,
        storage_uploaded: true,
        signed_url_created: Boolean(signedUrl),
        storagePath,
        signedUrl,
      },
      ip: {
        pdf_generated: ipPdfGenerated,
        storage_uploaded: ipStorageUploaded,
        storagePath: ipStoragePath,
      },
      email_sent: false,
      error:
        "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set for NDA confirmation e-mail (storage upload completed).",
      debugNdaDelivery,
      includeIp,
    });
  }
  const from = `Generic Music World <${fromAddress}>`;

  const resend = new Resend(apiKey);

  const bodySecondParagraph =
    includeIp && ipAttachedToEmail
      ? `Bu süreç kapsamında Gizlilik Sözleşmesi'ni (NDA) ve Fikri Mülkiyet taahhüdünü onayladınız. Onayladığınız belgelerin kopyalarını bu e-postanın eklerinde bulabilirsiniz.`
      : `Bu süreç kapsamında Gizlilik Sözleşmesi'ni (NDA) onayladınız. Onayladığınız sözleşmenin bir kopyasını bu e-postanın ekinde bulabilirsiniz.`;

  const onboardingCompleteEmailHtml = buildGmwDarkCardEmailHtml({
    headlineHtml: "GMW onboarding süreciniz tamamlandı",
    bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.55;color:#d1d5db;">
Hesabınız şu anda aktif değildir. Yetkili tarafından personel atamanız gerçekleştirildikten sonra tarafınıza bilgilendirme e-postası gönderilecektir. Bu e-postayı aldıktan sonra sisteme giriş yapabilirsiniz.
</p>
<p style="margin:16px 0 0 0;font-size:15px;line-height:1.55;color:#d1d5db;">
${bodySecondParagraph}
</p>`,
    signatureLine: "Generic Music World",
  });

  const attachments: {
    filename: string;
    content: Buffer;
    contentType: "application/pdf";
  }[] = [
    {
      filename: "Gizlilik-Sozlesmesi.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];
  if (ipPdfGenerated && ipStorageUploaded && ipBuffer) {
    attachments.push({
      filename: "Fikri-Mulkiyet-Sozlesmesi.pdf",
      content: ipBuffer,
      contentType: "application/pdf",
    });
  }

  console.info(`${NDA_FLOW_LOG} 10. email send started`, { to: email });
  console.info("[nda-email-debug] Resend send — recipient", { to: email });
  console.log("ONBOARDING MAIL START");
  const to = email;
  console.log("recipient:", to);
  let resendResult: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    resendResult = await resend.emails.send({
      from,
      to,
      subject: "GMW Onboarding Süreciniz Tamamlandı",
      html: onboardingCompleteEmailHtml,
      attachments,
    });
  } catch (error) {
    console.error("ONBOARDING MAIL ERROR:", error);
    const msg =
      error instanceof Error ? error.message : `NDA e-mail send threw: ${String(error)}`;
    console.error("[finalizeNdaAcceptanceDelivery]", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength,
      ipPdfByteLength: includeIp ? ipPdfByteLength : null,
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      ipStorageUploadAttempted,
      ipStorageUploadSucceeded: ipStorageUploaded,
      ipStorageVerifyWarning,
      emailAttempted: true,
      emailSkipped: false,
      resendSucceeded: false,
      resendErrorMessage: msg,
    });
    console.info("[debugNdaDelivery]", { stage: "resend_throw", debugNdaDelivery });
    return finalizeSuccess({
      nda: {
        pdf_generated: true,
        storage_uploaded: true,
        signed_url_created: Boolean(signedUrl),
        storagePath,
        signedUrl,
      },
      ip: {
        pdf_generated: ipPdfGenerated,
        storage_uploaded: ipStorageUploaded,
        storagePath: ipStoragePath,
      },
      email_sent: false,
      error: msg,
      debugNdaDelivery,
      includeIp,
    });
  }

  const mailError = resendResult.error;
  const resendData = resendResult.data as { id?: string } | undefined;
  console.info("[nda-email-debug] Resend response", {
    ok: !mailError,
    error: mailError?.message ?? null,
    resendEmailId: resendData?.id ?? null,
  });

  console.info(`${NDA_FLOW_LOG} 11. email send finished`, { ok: !mailError, error: mailError?.message });

  if (mailError) {
    console.error("ONBOARDING MAIL ERROR:", mailError);
    const msg = `NDA e-mail send failed: ${mailError.message}`;
    console.error("[finalizeNdaAcceptanceDelivery]", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength,
      ipPdfByteLength: includeIp ? ipPdfByteLength : null,
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      ipStorageUploadAttempted,
      ipStorageUploadSucceeded: ipStorageUploaded,
      ipStorageVerifyWarning,
      emailAttempted: true,
      emailSkipped: false,
      resendSucceeded: false,
      resendErrorMessage: mailError.message,
    });
    console.info("[debugNdaDelivery]", { stage: "resend_api_error", debugNdaDelivery });
    return finalizeSuccess({
      nda: {
        pdf_generated: true,
        storage_uploaded: true,
        signed_url_created: Boolean(signedUrl),
        storagePath,
        signedUrl,
      },
      ip: {
        pdf_generated: ipPdfGenerated,
        storage_uploaded: ipStorageUploaded,
        storagePath: ipStoragePath,
      },
      email_sent: false,
      error: msg,
      debugNdaDelivery,
      includeIp,
    });
  }

  const successDebug = mergeDebugNdaDelivery({
    reachedFinalizeNdaAcceptanceDelivery: true,
    pdfByteLength,
    ipPdfByteLength: includeIp ? ipPdfByteLength : null,
    storageUploadAttempted: true,
    storageUploadSucceeded: true,
    storageVerifyWarning,
    ipStorageUploadAttempted,
    ipStorageUploadSucceeded: ipStorageUploaded,
    ipStorageVerifyWarning,
    emailAttempted: true,
    emailSkipped: false,
    resendSucceeded: true,
    resendErrorMessage: null,
  });
  console.info("[debugNdaDelivery]", { stage: "complete", debugNdaDelivery: successDebug });
  return finalizeSuccess({
    nda: {
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      storagePath,
      signedUrl,
    },
    ip: {
      pdf_generated: ipPdfGenerated,
      storage_uploaded: ipStorageUploaded,
      storagePath: ipStoragePath,
    },
    email_sent: true,
    debugNdaDelivery: successDebug,
    includeIp,
    ...(signedUrl
      ? {}
      : {
          error:
            "Signed URL was not created; agreement PDFs were still attached to the e-mail. Check storage signing configuration.",
        }),
  });
}
