import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "@/lib/compliance/constants";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    agreement_key?: string;
    agreement_version?: string;
  } | null;

  const key = body?.agreement_key as AgreementKey | undefined;
  const version = body?.agreement_version;

  const validKeys = Object.values(AGREEMENT_KEYS) as string[];
  if (!key || !validKeys.includes(key)) {
    return NextResponse.json({ error: "Invalid agreement_key" }, { status: 400 });
  }

  const expected = AGREEMENT_VERSIONS[key];
  if (!version || version !== expected) {
    return NextResponse.json(
      { error: "Invalid or outdated agreement_version", expected },
      { status: 400 }
    );
  }

  const supabase = createVersionClient(user.accessToken);
  const ua = request.headers.get("user-agent") ?? undefined;
  const ip = clientIp(request);

  const { error: insErr } = await supabase.from("user_agreement_acceptances").insert({
    user_id: user.id,
    agreement_key: key,
    agreement_version: version,
    accepted_ip: ip,
    user_agent: ua,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
