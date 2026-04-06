/**
 * Shared table-based transactional email shell (dark navy card) aligned with
 * `docs/templates/supabase-invite-user.html` — used by app-sent mail (e.g. onboarding complete).
 * Logo URL uses `NEXT_PUBLIC_SITE_URL` + `/generic-music-logo-v2.png` when set.
 */

const COLORS = {
  pageBg: "#0f1419",
  cardBg: "#1a1f26",
  cardBorder: "#2d3748",
  textPrimary: "#f9fafb",
  textBody: "#d1d5db",
  textMuted: "#9ca3af",
  textFooter: "#6b7280",
  brandYellow: "#f5c542",
} as const;

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function logoImgTag(): string {
  const origin = siteOrigin();
  if (!origin) {
    return `<p style="margin:0;font-size:20px;font-weight:700;color:${COLORS.brandYellow};letter-spacing:0.04em;">GMW</p>`;
  }
  const src = `${origin}/generic-music-logo-v2.png`;
  return `<img src="${src}" alt="Generic Music World" width="168" style="display:block;height:auto;max-width:168px;margin:0 auto;border:0;outline:none;text-decoration:none;" />`;
}

export type GmwDarkCardEmailContent = {
  /** Main title inside the card (HTML allowed, e.g. highlighted spans) */
  headlineHtml: string;
  /** Main body: one or more &lt;p&gt; blocks */
  bodyHtml: string;
  /** Optional muted line above signature (e.g. bilgilendirme) */
  footerNoteHtml?: string;
  /** Closing brand line; default "Generic Music World" */
  signatureLine?: string;
  /** If true, omit logo row (rare) */
  omitLogo?: boolean;
};

/**
 * Full HTML document: outer dark background + centered rounded card, no CTA.
 */
export function buildGmwDarkCardEmailHtml(content: GmwDarkCardEmailContent): string {
  const signature = content.signatureLine ?? "Generic Music World";
  const footerNote = content.footerNoteHtml
    ? `<tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.55;color:${COLORS.textMuted};">
                  ${content.footerNoteHtml}
                </p>
              </td>
            </tr>`
    : "";

  const logoRow =
    content.omitLogo === true
      ? ""
      : `<tr>
              <td align="center" style="padding:24px 24px 12px 24px;">
                ${logoImgTag()}
              </td>
            </tr>`;

  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Generic Music World</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.pageBg};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${COLORS.textBody};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${COLORS.pageBg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:${COLORS.cardBg};border-radius:12px;border:1px solid ${COLORS.cardBorder};overflow:hidden;">
            ${logoRow}
            <tr>
              <td style="padding:8px 24px 12px 24px;">
                <p style="margin:0;padding:0;font-size:22px;font-weight:700;color:${COLORS.textPrimary};line-height:1.3;text-align:center;">
                  ${content.headlineHtml}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 8px 24px;">
                ${content.bodyHtml}
              </td>
            </tr>
            ${footerNote}
            <tr>
              <td style="padding:16px 24px 24px 24px;border-top:1px solid ${COLORS.cardBorder};">
                <p style="margin:0;font-size:14px;line-height:1.55;color:${COLORS.textPrimary};text-align:center;">
                  <span style="font-weight:600;">${signature}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Highlight key phrase with brand yellow (matches app `--brand-yellow`). */
export function gmwBrandHighlight(text: string): string {
  return `<span style="color:${COLORS.brandYellow};font-weight:700;">${text}</span>`;
}
