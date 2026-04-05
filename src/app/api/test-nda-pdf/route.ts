import { NextResponse } from "next/server";

import { generateNDAPdf } from "@/lib/pdf/generateNDA";

export const runtime = "nodejs";

/**
 * Temporary local PDF smoke test. Remove or protect before production.
 * GET /api/test-nda-pdf
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const pdf = await generateNDAPdf({
    full_name: "Ahmet Yılmaz",
    email: "ahmet@test.com",
    ip_address: "127.0.0.1",
    accepted_at: now.toISOString(),
    date: now.toISOString().slice(0, 10),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="nda-test.pdf"',
    },
  });
}
