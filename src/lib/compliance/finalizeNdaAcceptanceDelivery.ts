import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildGmwDarkCardEmailHtml } from "@/lib/email/gmwTransactionalEmail";
import { generateNDAPdf } from "@/lib/pdf/generateNDA";
import { Resend } from "resend";

const NDA_FLOW_LOG = "[nda-accept-flow]";
/** Log interval while PDF is generating — does not cancel Puppeteer; surfaces stalls/hangs. */
const PDF_STALL_LOG_INTERVAL_MS = 25_000;

const CONTRACTS_BUCKET = "contracts";
const NDA_OBJECT_PATH = (userId: string) => `generated/${userId}/nda_v1.pdf`;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

async function loadAppUserDisplayName(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string
): Promise<string> {
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
};

/** Temporary onboarding NDA pipeline observability (remove when stable). */
export type DebugNdaDeliveryPayload = {
  reachedFinalizeNdaAcceptanceDelivery: boolean;
  pdfByteLength: number | null;
  storageUploadAttempted: boolean;
  storageUploadSucceeded: boolean;
  storageVerifyWarning: boolean;
  emailAttempted: boolean;
  emailSkipped: boolean;
  resendSucceeded: boolean;
  resendErrorMessage: string | null;
};

function mergeDebugNdaDelivery(p: Partial<DebugNdaDeliveryPayload>): DebugNdaDeliveryPayload {
  return {
    reachedFinalizeNdaAcceptanceDelivery: p.reachedFinalizeNdaAcceptanceDelivery ?? true,
    pdfByteLength: p.pdfByteLength ?? null,
    storageUploadAttempted: p.storageUploadAttempted ?? false,
    storageUploadSucceeded: p.storageUploadSucceeded ?? false,
    storageVerifyWarning: p.storageVerifyWarning ?? false,
    emailAttempted: p.emailAttempted ?? false,
    emailSkipped: p.emailSkipped ?? true,
    resendSucceeded: p.resendSucceeded ?? false,
    resendErrorMessage: p.resendErrorMessage ?? null,
  };
}

export type FinalizeNdaAcceptanceDeliveryResult = {
  pdf_generated: boolean;
  storage_uploaded: boolean;
  signed_url_created: boolean;
  email_sent: boolean;
  /** True only when all four stages succeeded. */
  success: boolean;
  storagePath?: string;
  signedUrl?: string;
  error?: string;
  debugNdaDelivery?: DebugNdaDeliveryPayload;
};

function finalizeSuccess(
  partial: Omit<FinalizeNdaAcceptanceDeliveryResult, "success">
): FinalizeNdaAcceptanceDeliveryResult {
  const success =
    partial.pdf_generated &&
    partial.storage_uploaded &&
    partial.signed_url_created &&
    partial.email_sent;
  const { debugNdaDelivery, ...rest } = partial;
  return { ...rest, success, ...(debugNdaDelivery ? { debugNdaDelivery } : {}) };
}

export function ndaDeliveryResponseFields(
  outcome: FinalizeNdaAcceptanceDeliveryResult | undefined,
  logLabel: string
): Record<string, unknown> {
  if (!outcome) return {};
  if (!outcome.success) {
    console.error(`${logLabel} NDA delivery incomplete`, {
      error: outcome.error,
      pdf_generated: outcome.pdf_generated,
      storage_uploaded: outcome.storage_uploaded,
      signed_url_created: outcome.signed_url_created,
      email_sent: outcome.email_sent,
    });
  }
  return {
    nda: {
      delivered: outcome.success,
      pdf_generated: outcome.pdf_generated,
      storage_uploaded: outcome.storage_uploaded,
      signed_url_created: outcome.signed_url_created,
      email_sent: outcome.email_sent,
      ...(outcome.storagePath ? { storagePath: outcome.storagePath } : {}),
      ...(outcome.signedUrl ? { signedUrl: outcome.signedUrl } : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
    },
  };
}

/**
 * After NDA (confidentiality) is recorded: PDF → Supabase Storage → signed URL → Resend e-mail with attachment.
 * Single orchestration entry point; storage + `app_users` name lookup use service role (`createClient` + `SUPABASE_SERVICE_ROLE_KEY`). Does not throw; returns per-stage flags.
 * If signed URL creation fails but upload succeeded, e-mail is still attempted (attachment only, no link).
 */
export async function finalizeNdaAcceptanceDelivery(
  input: FinalizeNdaAcceptanceDeliveryInput
): Promise<FinalizeNdaAcceptanceDeliveryResult> {
  console.log("FINALIZE NDA DELIVERY START");
  console.info("[nda-email-debug] finalizeNdaAcceptanceDelivery started", {
    userId: input.userId,
    recipientEmail: input.email?.trim() ?? null,
  });
  try {
    return await runNdaAcceptanceDelivery(input);
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
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: msg,
      debugNdaDelivery,
    });
  }
}

async function runNdaAcceptanceDelivery(
  input: FinalizeNdaAcceptanceDeliveryInput
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
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: "Missing user email for NDA delivery",
      debugNdaDelivery,
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
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for NDA storage",
      debugNdaDelivery,
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
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: `NDA PDF generation failed: ${msg}`,
      debugNdaDelivery,
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
      pdf_generated: true,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      storagePath,
      error: msg,
      debugNdaDelivery,
    });
  }

  console.info(`${NDA_FLOW_LOG} 7. storage upload finished`, { storagePath });

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
  const storageVerifyWarning = Boolean(downloadErr || verifyBytes === 0);
  if (downloadErr || verifyBytes === 0) {
    console.warn("[finalizeNdaAcceptanceDelivery] STORAGE_VERIFY_DOWNLOAD_WARN", {
      storagePath,
      downloadErr: downloadErr?.message ?? null,
      verifyBytes,
      note: "Upload succeeded — continuing to signed URL + email",
    });
  }

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
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      emailSkipped: true,
      resendErrorMessage:
        "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set for NDA confirmation e-mail (storage upload completed).",
    });
    console.info("[debugNdaDelivery]", { stage: "email_skipped_resend_config", debugNdaDelivery });
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error:
        "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set for NDA confirmation e-mail (storage upload completed).",
      debugNdaDelivery,
    });
  }
  const from = `Generic Music World <${fromAddress}>`;

  const resend = new Resend(apiKey);

  const onboardingCompleteEmailHtml = buildGmwDarkCardEmailHtml({
    headlineHtml: "GMW onboarding süreciniz tamamlandı",
    bodyHtml: `<p style="margin:0;font-size:15px;line-height:1.55;color:#d1d5db;">
Hesabınız şu anda aktif değildir. Yetkili tarafından personel atamanız gerçekleştirildikten sonra tarafınıza bilgilendirme e-postası gönderilecektir. Bu e-postayı aldıktan sonra sisteme giriş yapabilirsiniz.
</p>
<p style="margin:16px 0 0 0;font-size:15px;line-height:1.55;color:#d1d5db;">
Bu süreç kapsamında Gizlilik Sözleşmesi'ni (NDA) onayladınız. Onayladığınız sözleşmenin bir kopyasını bu e-postanın ekinde bulabilirsiniz.
</p>`,
    signatureLine: "Generic Music World",
  });

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
      attachments: [{ filename: "nda_v1.pdf", content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (error) {
    console.error("ONBOARDING MAIL ERROR:", error);
    const msg =
      error instanceof Error ? error.message : `NDA e-mail send threw: ${String(error)}`;
    console.error("[finalizeNdaAcceptanceDelivery]", msg);
    const debugNdaDelivery = mergeDebugNdaDelivery({
      reachedFinalizeNdaAcceptanceDelivery: true,
      pdfByteLength,
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      emailAttempted: true,
      emailSkipped: false,
      resendSucceeded: false,
      resendErrorMessage: msg,
    });
    console.info("[debugNdaDelivery]", { stage: "resend_throw", debugNdaDelivery });
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error: msg,
      debugNdaDelivery,
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
      storageUploadAttempted: true,
      storageUploadSucceeded: true,
      storageVerifyWarning,
      emailAttempted: true,
      emailSkipped: false,
      resendSucceeded: false,
      resendErrorMessage: mailError.message,
    });
    console.info("[debugNdaDelivery]", { stage: "resend_api_error", debugNdaDelivery });
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error: msg,
      debugNdaDelivery,
    });
  }

  const successDebug = mergeDebugNdaDelivery({
    reachedFinalizeNdaAcceptanceDelivery: true,
    pdfByteLength,
    storageUploadAttempted: true,
    storageUploadSucceeded: true,
    storageVerifyWarning,
    emailAttempted: true,
    emailSkipped: false,
    resendSucceeded: true,
    resendErrorMessage: null,
  });
  console.info("[debugNdaDelivery]", { stage: "complete", debugNdaDelivery: successDebug });
  return finalizeSuccess({
    pdf_generated: true,
    storage_uploaded: true,
    signed_url_created: Boolean(signedUrl),
    email_sent: true,
    storagePath,
    signedUrl,
    debugNdaDelivery: successDebug,
    ...(signedUrl
      ? {}
      : {
          error:
            "Signed URL was not created; the NDA PDF was still attached to the e-mail. Check storage signing configuration.",
        }),
  });
}
