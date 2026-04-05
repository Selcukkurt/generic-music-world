import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateNDAPdf } from "@/lib/pdf/generateNDA";
import { Resend } from "resend";

const NDA_FLOW_LOG = "[nda-accept-flow]";
/** Log interval while PDF is generating — does not cancel Puppeteer; surfaces stalls/hangs. */
const PDF_STALL_LOG_INTERVAL_MS = 25_000;

const CONTRACTS_BUCKET = "contracts";
const NDA_OBJECT_PATH = (userId: string) => `generated/${userId}/nda_v1.pdf`;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

function escapeEmailHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
};

function finalizeSuccess(
  partial: Omit<FinalizeNdaAcceptanceDeliveryResult, "success">
): FinalizeNdaAcceptanceDeliveryResult {
  const success =
    partial.pdf_generated &&
    partial.storage_uploaded &&
    partial.signed_url_created &&
    partial.email_sent;
  return { ...partial, success };
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
    return finalizeSuccess({
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: msg,
    });
  }
}

async function runNdaAcceptanceDelivery(
  input: FinalizeNdaAcceptanceDeliveryInput
): Promise<FinalizeNdaAcceptanceDeliveryResult> {
  const email = input.email?.trim();
  if (!email) {
    return finalizeSuccess({
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: "Missing user email for NDA delivery",
    });
  }

  console.info(`${NDA_FLOW_LOG} 3. finalizeNdaAcceptanceDelivery started`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return finalizeSuccess({
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for NDA storage",
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
    return finalizeSuccess({
      pdf_generated: false,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      error: `NDA PDF generation failed: ${msg}`,
    });
  } finally {
    clearInterval(pdfStallTimer);
  }

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
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: false,
      signed_url_created: false,
      email_sent: false,
      storagePath,
      error: msg,
    });
  }

  console.info(`${NDA_FLOW_LOG} 7. storage upload finished`, { storagePath });

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
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error:
        "RESEND_API_KEY and EMAIL_FROM (or RESEND_FROM) must be set for NDA confirmation e-mail (storage upload completed).",
    });
  }
  const from = `Generic Music World <${fromAddress}>`;

  const resend = new Resend(apiKey);
  const safeName = escapeEmailHtml(fullName);
  const linkBlock =
    signedUrl != null
      ? (() => {
          const href = signedUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
          return `<p>You can also download the same document using this link (private, expires in 7 days):<br />
<a href="${href}">Download NDA PDF</a></p>`;
        })()
      : "<p>A direct download link could not be generated; please use the attached PDF.</p>";

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
      subject: "NDA Agreement Confirmation",
      html: `<p>Hello ${safeName},</p>
<p>Thank you for accepting the non-disclosure agreement. A copy of your agreement is attached to this message.</p>
${linkBlock}
<p>— Generic Music World</p>`,
      attachments: [{ filename: "nda_v1.pdf", content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (error) {
    console.error("ONBOARDING MAIL ERROR:", error);
    const msg =
      error instanceof Error ? error.message : `NDA e-mail send threw: ${String(error)}`;
    console.error("[finalizeNdaAcceptanceDelivery]", msg);
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error: msg,
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
    return finalizeSuccess({
      pdf_generated: true,
      storage_uploaded: true,
      signed_url_created: Boolean(signedUrl),
      email_sent: false,
      storagePath,
      signedUrl,
      error: msg,
    });
  }

  return finalizeSuccess({
    pdf_generated: true,
    storage_uploaded: true,
    signed_url_created: Boolean(signedUrl),
    email_sent: true,
    storagePath,
    signedUrl,
    ...(signedUrl
      ? {}
      : {
          error:
            "Signed URL was not created; the NDA PDF was still attached to the e-mail. Check storage signing configuration.",
        }),
  });
}
