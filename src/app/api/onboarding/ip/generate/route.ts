import { NextResponse } from "next/server";

import { generateIpPdf } from "@/lib/pdf/generateIpPdf";

export const runtime = "nodejs";

type Body = {
  full_name?: string;
  date?: string;
  email?: string;
  ip_address?: string;
  accepted_at?: string;
};

/**
 * POST /api/onboarding/ip/generate
 * Gövde: `{ "full_name"?, "date"?, ... }` — en azından `full_name` ve `date` ile doldurulabilir; diğer alanlar için geliştirme varsayılanları.
 * Yanıt: PDF (inline, NDA önizlemesi gibi).
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Body = {};
  try {
    const raw: unknown = await req.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Body;
  } catch {
    /* boş gövde */
  }

  const now = new Date();
  const pdf = await generateIpPdf({
    full_name:
      typeof body.full_name === "string" && body.full_name.trim() !== ""
        ? body.full_name.trim()
        : "Örnek Kullanıcı",
    date:
      typeof body.date === "string" && body.date.trim() !== ""
        ? body.date.trim()
        : now.toISOString().slice(0, 10),
    email:
      typeof body.email === "string" && body.email.trim() !== ""
        ? body.email.trim()
        : "ornek@test.com",
    ip_address:
      typeof body.ip_address === "string" && body.ip_address.trim() !== ""
        ? body.ip_address.trim()
        : "127.0.0.1",
    accepted_at:
      typeof body.accepted_at === "string" && body.accepted_at.trim() !== ""
        ? body.accepted_at.trim()
        : now.toISOString(),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="fikri-mulkiyet.pdf"',
    },
  });
}
