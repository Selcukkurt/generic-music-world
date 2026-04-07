import fs from "fs/promises";
import path from "path";

import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import {
  NDA_DOCUMENT_TITLE,
  NDA_PDF_SIGNFOOT,
  NDA_SECTIONS,
} from "@/content/compliance/nda-gizlilik-content";
import { applyPlaceholders, sectionsToHtml } from "@/lib/pdf/pdfTemplateUtils";
import { renderHtmlToPdfBuffer, type PdfPageMargins } from "@/lib/pdf/renderHtmlToPdf";

/** NDA template uses `@page { margin }`; avoid doubling with Puppeteer. */
const NDA_PDF_MARGIN: PdfPageMargins = {
  top: "0mm",
  right: "0mm",
  bottom: "0mm",
  left: "0mm",
};

const NDA_TEMPLATE_REL = path.join("contracts", "templates", "nda_v1.html");
const NDA_FLOW_LOG = "[nda-accept-flow]";

export type GenerateNDAPdfInput = {
  full_name: string;
  email: string;
  ip_address: string;
  accepted_at: string;
  date: string;
  /** Defaults to current `AGREEMENT_VERSIONS.confidentiality`. */
  agreement_version?: string;
};

/**
 * Reads the NDA HTML template, substitutes placeholders, renders A4 PDF via Puppeteer.
 * Intended for Node/server use only (not Edge).
 */
export async function generateNDAPdf(input: GenerateNDAPdfInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), NDA_TEMPLATE_REL);
  const raw = await fs.readFile(templatePath, "utf8");
  const sectionsHtml = sectionsToHtml(NDA_SECTIONS);
  let html = applyPlaceholders(raw, {
    document_title: NDA_DOCUMENT_TITLE,
    signfoot: NDA_PDF_SIGNFOOT,
    full_name: input.full_name,
    email: input.email,
    ip_address: input.ip_address,
    accepted_at: input.accepted_at,
    date: input.date,
    agreement_version: input.agreement_version ?? AGREEMENT_VERSIONS[AGREEMENT_KEYS.confidentiality],
  });
  html = html.split("{{SECTIONS_HTML}}").join(sectionsHtml);

  const pdfGenT0 = Date.now();
  console.info(`${NDA_FLOW_LOG} 4. PDF generation started`);

  const buf = await renderHtmlToPdfBuffer(html, NDA_PDF_MARGIN);
  console.info(`${NDA_FLOW_LOG} 5. PDF generation finished`, { durationMs: Date.now() - pdfGenT0 });
  return buf;
}
