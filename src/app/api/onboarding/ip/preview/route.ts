import { NextResponse } from "next/server";

import { ipPreviewInputFromRequest } from "@/lib/pdf/buildIpAgreementHtml";
import { generateIpPdf } from "@/lib/pdf/generateIpPdf";

export const runtime = "nodejs";

/**
 * GET /api/onboarding/ip/preview
 * `/api/test-ip-pdf` ile aynı çıktı ve pipeline; eski yol uyumluluğu için tutulur.
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
      "Content-Disposition": 'inline; filename="ip-preview.pdf"',
    },
  });
}
