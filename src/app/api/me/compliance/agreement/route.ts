import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS, type AgreementKey } from "@/lib/compliance/constants";
import { resolveAcceptanceSourceForWrite } from "@/lib/compliance/userAgreementAcceptances";
import {
  finalizeNdaAcceptanceDelivery,
  ndaDeliveryResponseFields,
  type FinalizeNdaAcceptanceDeliveryResult,
} from "@/lib/compliance/finalizeNdaAcceptanceDelivery";
import { getRequestClientIp } from "@/lib/http/clientIp";

export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    agreement_key?: string;
    agreement_version?: string;
    locale?: string | null;
    acceptance_source?: string | null;
    source?: string | null;
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
    let ndaOutcome: FinalizeNdaAcceptanceDeliveryResult | undefined;
    if (key === AGREEMENT_KEYS.confidentiality) {
      ndaOutcome = await finalizeNdaAcceptanceDelivery({
        userId: user.id,
        email: user.email ?? "",
        clientIp: getRequestClientIp(request),
        acceptedAtIso: nowIso,
        agreementVersion: version,
      });
    }
    return NextResponse.json({
      ok: true,
      status: "completed",
      reactivated: true,
      ...ndaDeliveryResponseFields(ndaOutcome, "[compliance/agreement]"),
    });
  }

  // Already accepted: do not regenerate PDF or resend e-mail.
  if (existing && existing.revoked_at == null) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { error: insErr } = await supabase.from("user_agreement_acceptances").insert({
    user_id: user.id,
    agreement_key: key,
    agreement_version: version,
    locale,
    acceptance_source: acceptanceSource,
    accepted_at: nowIso,
  });

  if (insErr) {
    // Race: another request recorded acceptance — treat as duplicate; no NDA e-mail.
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  let ndaOutcome: FinalizeNdaAcceptanceDeliveryResult | undefined;
  if (key === AGREEMENT_KEYS.confidentiality) {
    ndaOutcome = await finalizeNdaAcceptanceDelivery({
      userId: user.id,
      email: user.email ?? "",
      clientIp: getRequestClientIp(request),
      acceptedAtIso: nowIso,
      agreementVersion: version,
    });
  }
  return NextResponse.json({
    ok: true,
    status: "completed",
    ...ndaDeliveryResponseFields(ndaOutcome, "[compliance/agreement]"),
  });
}
