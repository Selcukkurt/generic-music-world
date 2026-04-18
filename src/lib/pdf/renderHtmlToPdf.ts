import puppeteer from "puppeteer";

const DEFAULT_CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Passed to Puppeteer `page.pdf({ margin })`. Use zeros when `@page` drives margins (NDA/IP templates). */
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

function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

function browserlessToken(): string | undefined {
  const t = process.env.BROWSERLESS_API_KEY ?? process.env.BROWSERLESS_TOKEN;
  return typeof t === "string" && t.trim() !== "" ? t.trim() : undefined;
}

/**
 * Remote HTML→PDF (managed Chromium). Optional; set `BROWSERLESS_API_KEY` (or `BROWSERLESS_TOKEN`).
 * @see https://docs.browserless.io/rest-apis/pdf
 */
async function renderHtmlViaBrowserless(html: string, margin: PdfPageMargins): Promise<Buffer> {
  const token = browserlessToken();
  if (!token) {
    throw new Error("Browserless: BROWSERLESS_API_KEY or BROWSERLESS_TOKEN is not set");
  }
  const host = (process.env.BROWSERLESS_HOST ?? "https://production-sfo.browserless.io").replace(/\/$/, "");
  const url = `${host}/pdf?token=${encodeURIComponent(token)}`;
  console.info("[renderHtmlToPdfBuffer] renderer_selected", {
    renderer: "browserless",
    launchPath: `${host}/pdf`,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      html,
      options: {
        format: "A4",
        printBackground: true,
        margin: {
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[renderHtmlToPdfBuffer] browserless_http_error", {
      status: res.status,
      bodyPreview: text.slice(0, 800),
    });
    throw new Error(`Browserless PDF failed: HTTP ${res.status} — ${text.slice(0, 240)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function renderHtmlViaSparticuz(html: string, margin: PdfPageMargins): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteerCore = (await import("puppeteer-core")).default;
  const executablePath = await chromium.executablePath();

  console.info("[renderHtmlToPdfBuffer] renderer_selected", {
    renderer: "sparticuz_chromium",
    packageNote:
      "@sparticuz/chromium >= 147 detects VERCEL and inflates al2023.tar.br + sets LD_LIBRARY_PATH",
    launchPath: executablePath ?? null,
    hasExecutablePath: Boolean(executablePath),
    node: process.version,
    LD_LIBRARY_PATH_preview: process.env.LD_LIBRARY_PATH?.slice(0, 160) ?? null,
  });

  let browser;
  try {
    /** Chromium.args already includes chrome-headless-shell flags; do not pass conflicting headless options. */
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[renderHtmlToPdfBuffer] sparticuz_launch_failed", {
      executablePath: executablePath ?? null,
      errorMessage: message,
      stack,
      LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH?.slice(0, 200) ?? null,
    });
    throw new Error(`Puppeteer could not launch serverless Chromium. ${message}`);
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

/**
 * Renders full HTML document to A4 PDF. Server/Node only (not Edge).
 *
 * **Production (Vercel):** prefers Browserless when `BROWSERLESS_API_KEY` is set; otherwise Sparticuz
 * with a Lambda env shim so bundled `al2023` libs extract. **Local:** full `puppeteer` + Chrome.
 */
export async function renderHtmlToPdfBuffer(
  html: string,
  margin: PdfPageMargins = DEFAULT_PDF_MARGIN
): Promise<Buffer> {
  const token = browserlessToken();
  if (token) {
    try {
      return await renderHtmlViaBrowserless(html, margin);
    } catch (e) {
      if (!isVercel()) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[renderHtmlToPdfBuffer] browserless_failed_falling_back_sparticuz", { message: msg });
    }
  }

  if (isVercel()) {
    return renderHtmlViaSparticuz(html, margin);
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || DEFAULT_CHROME_MAC;
  console.info("[renderHtmlToPdfBuffer] renderer_selected", {
    renderer: "local_puppeteer",
    launchPath: executablePath,
  });

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
    console.error("[renderHtmlToPdfBuffer] local_puppeteer_launch_failed", {
      executablePath,
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
