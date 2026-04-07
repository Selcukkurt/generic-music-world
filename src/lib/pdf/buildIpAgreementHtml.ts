import fs from "fs/promises";
import path from "path";

import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import {
  IP_COVER_SUBTITLE,
  IP_COVER_TITLE,
  IP_DOCUMENT_SUBTITLE,
  IP_DOCUMENT_TITLE,
  IP_PDF_SIGNFOOT,
  IP_SECTIONS,
} from "@/content/compliance/ip-fikri-mulkiyet-content";
import { applyPlaceholders, sectionsToHtml } from "@/lib/pdf/pdfTemplateUtils";

const IP_TEMPLATE_REL = path.join("contracts", "templates", "ip_v1.html");

export type GenerateIpPdfInput = {
  full_name: string;
  email: string;
  ip_address: string;
  accepted_at: string;
  date: string;
  /** Defaults to current `AGREEMENT_VERSIONS.intellectual_property`. */
  agreement_version?: string;
};

/**
 * Tam ip_v1.html — bölümler + meta placeholder’ları tek seferde çözülür (`{{full_name}}` / `{{date}}`
 * IP_SECTIONS gövdesinde de kullanılabilir). PDF ve tarayıcıda HTML önizleme aynı çıktıyı paylaşır.
 */
export async function buildIpAgreementHtml(input: GenerateIpPdfInput): Promise<string> {
  const templatePath = path.join(process.cwd(), IP_TEMPLATE_REL);
  const raw = await fs.readFile(templatePath, "utf8");
  const sectionsHtml = sectionsToHtml(IP_SECTIONS);
  const vars = {
    cover_title: IP_COVER_TITLE,
    cover_subtitle: IP_COVER_SUBTITLE,
    document_title: IP_DOCUMENT_TITLE,
    document_subtitle: IP_DOCUMENT_SUBTITLE,
    signfoot: IP_PDF_SIGNFOOT,
    full_name: input.full_name,
    email: input.email,
    ip_address: input.ip_address,
    accepted_at: input.accepted_at,
    date: input.date,
    agreement_version: input.agreement_version ?? AGREEMENT_VERSIONS[AGREEMENT_KEYS.intellectual_property],
  };
  let html = raw.split("{{SECTIONS_HTML}}").join(sectionsHtml);
  html = applyPlaceholders(html, vars);
  return html;
}

/** Dev önizleme: `?full_name=&date=` vb. (boşsa NDA testiyle aynı örnek veriler). */
export function ipPreviewInputFromRequest(req: Request): GenerateIpPdfInput {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const d = now.toISOString().slice(0, 10);

  const q = (key: string, fallback: string) => {
    const v = searchParams.get(key)?.trim();
    return v !== undefined && v !== "" ? v : fallback;
  };

  const agreementRaw = searchParams.get("agreement_version")?.trim();
  return {
    full_name: q("full_name", "Ahmet Yılmaz"),
    email: q("email", "ahmet@test.com"),
    ip_address: q("ip_address", "127.0.0.1"),
    accepted_at: q("accepted_at", now.toISOString()),
    date: q("date", d),
    agreement_version: agreementRaw !== undefined && agreementRaw !== "" ? agreementRaw : undefined,
  };
}
