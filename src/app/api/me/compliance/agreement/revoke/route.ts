import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "@/lib/compliance/constants";
import { isOnboardingComplete } from "@/lib/auth/onboardingStatus";

/** Option A: self-service revoke only for confidentiality (NDA) while onboarding is not fully completed. */
export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { agreement_key?: string } | null;
  const key = body?.agreement_key as AgreementKey | undefined;
  if (key !== AGREEMENT_KEYS.confidentiality) {
    return NextResponse.json({ error: "Only confidentiality agreements can be revoked here" }, { status: 400 });
  }

  const supabase = createVersionClient(user.accessToken);

  const { data: profile, error: profErr } = await supabase
    .from("app_users")
    .select("onboarding_completed_at, onboarding_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  if (isOnboardingComplete(profile ?? {})) {
    return NextResponse.json(
      { error: "Onboarding tamamlandıktan sonra bu onay kullanıcı tarafından geri alınamaz." },
      { status: 403 }
    );
  }

  const version = AGREEMENT_VERSIONS[key];
  const nowIso = new Date().toISOString();

  const { data: rows, error: selErr } = await supabase
    .from("user_agreement_acceptances")
    .select("id, revoked_at")
    .eq("user_id", user.id)
    .eq("agreement_key", key)
    .eq("agreement_version", version)
    .is("revoked_at", null);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const row = rows?.[0];
  if (!row) {
    return NextResponse.json({ ok: true, status: "noop", message: "No active acceptance for this version" });
  }

  const { error: updErr } = await supabase
    .from("user_agreement_acceptances")
    .update({ revoked_at: nowIso })
    .eq("id", row.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "revoked" });
}
