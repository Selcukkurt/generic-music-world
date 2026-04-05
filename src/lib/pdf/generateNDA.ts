import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import {
  NDA_DOCUMENT_TITLE,
  NDA_PDF_SIGNFOOT,
  NDA_SECTIONS,
  type NdaSection,
} from "@/content/compliance/nda-gizlilik-content";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyPlaceholders(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    const safe = escapeHtml(value ?? "");
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}

function sectionsToHtml(sections: NdaSection[]): string {
  return sections
    .map(
      (sec) =>
        `<section><h2>${escapeHtml(sec.title)}</h2>${sec.paragraphs
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("")}</section>`
    )
    .join("");
}

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

  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  const launchOpts: NonNullable<Parameters<typeof puppeteer.launch>[0]> = {
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[generateNDAPdf] Puppeteer launch failed", {
      executablePath,
      headless: true,
      errorMessage: message,
      stack,
    });
    throw new Error(
      `Puppeteer could not launch Chrome at ${executablePath}. ${message}. Ensure Google Chrome is installed at this path or adjust executablePath.`
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
    });
    const buf = Buffer.from(pdf);
    console.info(`${NDA_FLOW_LOG} 5. PDF generation finished`, { durationMs: Date.now() - pdfGenT0 });
    return buf;
  } finally {
    await browser.close();
  }
}
