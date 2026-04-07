import { NextResponse } from "next/server";

import { ipPreviewInputFromRequest } from "@/lib/pdf/buildIpAgreementHtml";
import { generateIpPdf } from "@/lib/pdf/generateIpPdf";

export const runtime = "nodejs";

/**
 * Yerel IP PDF önizleme — NDA’daki `GET /api/test-nda-pdf` ile aynı model (yalnızca development).
 * İsteğe bağlı sorgu: `?full_name=...&date=YYYY-MM-DD&email=...` (`buildIpAgreementHtml` pipeline’ı).
 *
 * GET /api/test-ip-pdf
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdf = await generateIpPdf(ipPreviewInputFromRequest(req));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="ip-test.pdf"',
    },
  });
}
