import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import { resolveAcceptanceSourceForWrite } from "@/lib/compliance/userAgreementAcceptances";

/**
 * Legacy path: same behavior as POST /api/me/compliance/agreement for confidentiality + current version.
 * Prefer the compliance route on new clients (metadata / single entry point).
 */
export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    agreement_version?: string;
    locale?: string | null;
    acceptance_source?: string | null;
    source?: string | null;
  } | null;

  const key = AGREEMENT_KEYS.confidentiality;
  const expected = AGREEMENT_VERSIONS[key];
  const version = body?.agreement_version;
  if (!version || version !== expected) {
    return NextResponse.json({ error: "Invalid or outdated agreement_version", expected }, { status: 400 });
  }

  const supabase = createVersionClient(user.accessToken);
  const locale = body?.locale ?? null;
  const acceptanceSource = resolveAcceptanceSourceForWrite(body);

  const { data: existing, error: selErr } = await supabase
    .from("user_agreement_acceptances")
    .select("id, revoked_at")
    .eq("user_id", user.id)
    .eq("agreement_key", key)
    .eq("agreement_version", version)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  if (existing?.revoked_at) {
    const { error: updErr } = await supabase
      .from("user_agreement_acceptances")
      .update({
        revoked_at: null,
        accepted_at: nowIso,
        locale,
        acceptance_source: acceptanceSource,
      })
      .eq("id", existing.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "completed", reactivated: true });
  }

  if (existing && existing.revoked_at == null) {
    return NextResponse.json({ ok: true, status: "completed", duplicate: true });
  }

  const { error: insErr } = await supabase.from("user_agreement_acceptances").insert({
    user_id: user.id,
    agreement_key: key,
    agreement_version: version,
    locale,
    acceptance_source: acceptanceSource,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, status: "completed", duplicate: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "completed" });
}
