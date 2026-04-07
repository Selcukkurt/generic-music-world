import puppeteer from "puppeteer";

const DEFAULT_CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Passed to Puppeteer `page.pdf({ margin })`. Use zeros when the HTML template sets margins via `@page`. */
export type PdfPageMargins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

const DEFAULT_PDF_MARGIN: PdfPageMargins = {
  top: "18mm",
  right: "16mm",
  bottom: "18mm",
  left: "16mm",
};

/**
 * Renders full HTML document to A4 PDF via Puppeteer. Server/Node only (not Edge).
 * @param margin — Omit to use 18mm/16mm gutters (e.g. IP PDF). Pass all zeros for `@page`-driven margins (NDA).
 */
export async function renderHtmlToPdfBuffer(
  html: string,
  margin: PdfPageMargins = DEFAULT_PDF_MARGIN
): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || DEFAULT_CHROME_MAC;

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
    console.error("[renderHtmlToPdfBuffer] Puppeteer launch failed", {
      executablePath,
      headless: true,
      errorMessage: message,
      stack,
    });
    throw new Error(
      `Puppeteer could not launch Chrome at ${executablePath}. ${message}. Install Chrome or set PUPPETEER_EXECUTABLE_PATH.`
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
