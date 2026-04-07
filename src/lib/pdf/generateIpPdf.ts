import { buildIpAgreementHtml, type GenerateIpPdfInput } from "@/lib/pdf/buildIpAgreementHtml";
import { renderHtmlToPdfBuffer, type PdfPageMargins } from "@/lib/pdf/renderHtmlToPdf";

/** Same as NDA: `@page { margin }` in template; Puppeteer margins must be zero. */
const IP_PDF_MARGIN: PdfPageMargins = {
  top: "0mm",
  right: "0mm",
  bottom: "0mm",
  left: "0mm",
};

const NDA_FLOW_LOG = "[nda-accept-flow]";

export type { GenerateIpPdfInput };

/**
 * IP assignment PDF — `buildIpAgreementHtml` + Puppeteer; önizleme route’ları ile aynı HTML.
 */
export async function generateIpPdf(input: GenerateIpPdfInput): Promise<Buffer> {
  const html = await buildIpAgreementHtml(input);

  const pdfGenT0 = Date.now();
  console.info(`${NDA_FLOW_LOG} 4b. IP PDF generation started`);

  const buf = await renderHtmlToPdfBuffer(html, IP_PDF_MARGIN);
  console.info(`${NDA_FLOW_LOG} 5b. IP PDF generation finished`, { durationMs: Date.now() - pdfGenT0 });
  return buf;
}
