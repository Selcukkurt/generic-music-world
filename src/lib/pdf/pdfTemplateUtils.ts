/** Shared HTML escaping and section rendering for agreement PDF templates. */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyPlaceholders(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    const safe = escapeHtml(value ?? "");
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}

export function sectionsToHtml(sections: { title: string; paragraphs: string[] }[]): string {
  return sections
    .map(
      (sec) =>
        `<section><h2>${escapeHtml(sec.title)}</h2>${sec.paragraphs
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("")}</section>`
    )
    .join("");
}
