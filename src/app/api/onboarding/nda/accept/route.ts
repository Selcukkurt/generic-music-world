import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getApiUser, createVersionClient, type ApiUser } from "@/lib/version/api-auth";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";
import { resolveAcceptanceSourceForWrite } from "@/lib/compliance/userAgreementAcceptances";
import {
  finalizeNdaAcceptanceDelivery,
  ndaDeliveryResponseFields,
  type FinalizeNdaAcceptanceDeliveryResult,
} from "@/lib/compliance/finalizeNdaAcceptanceDelivery";
import { getRequestClientIp } from "@/lib/http/clientIp";

const NDA_FLOW_LOG = "[nda-accept-flow]";

/**
 * Legacy path: same behavior as POST /api/me/compliance/agreement for confidentiality + current version.
 * Prefer the compliance route on new clients (metadata / single entry point).
 */
export async function POST(request: NextRequest) {
  console.log("[NDA ROUTE] entered");
  console.info(`${NDA_FLOW_LOG} 1. route entered`);
  const authResult = await getApiUser(request);
  let user: ApiUser;
  if (authResult.user) {
    user = authResult.user;
  } else if (process.env.NODE_ENV === "development") {
    // TODO: remove — local debugging only; getApiUser failed / no session
    console.warn("[NDA ROUTE] DEBUG: getApiUser did not return a user; using mock user");
    user = {
      // Dev only: real app_users.id (FK + seeded auth). Verified 2026-04 — replace if your DB differs.
      id: "fe5a7da6-b62d-4f59-8b29-9cf8ba8b1a03",
      email: "test@test.com",
      role: "viewer",
      accessToken: "",
    };
  } else if (authResult.error) {
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return authResult.error;
  } else {
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return NextResponse.json({ error: "Invalid or outdated agreement_version", expected }, { status: 400 });
  }

  let supabase: SupabaseClient;
  if (process.env.NODE_ENV === "development") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      console.info(`${NDA_FLOW_LOG} 12. route response returned`);
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for NDA accept in development",
        },
        { status: 500 }
      );
    }
    supabase = createClient(url, serviceRoleKey);
  } else {
    supabase = createVersionClient(user.accessToken);
  }

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
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
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
      console.info(`${NDA_FLOW_LOG} 12. route response returned`);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    console.info(`${NDA_FLOW_LOG} 2. acceptance record created / updated (reactivated)`);
    const ndaOutcome: FinalizeNdaAcceptanceDeliveryResult = await finalizeNdaAcceptanceDelivery({
      userId: user.id,
      email: user.email ?? "",
      clientIp: getRequestClientIp(request),
      acceptedAtIso: nowIso,
      agreementVersion: version,
    });
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return NextResponse.json({
      ok: true,
      status: "completed",
      reactivated: true,
      ...ndaDeliveryResponseFields(ndaOutcome, "[onboarding/nda/accept]"),
    });
  }

  // Already accepted: do not regenerate PDF or resend e-mail.
  if (existing && existing.revoked_at == null) {
    console.info(`${NDA_FLOW_LOG} 2. acceptance record unchanged (duplicate — no DB write)`);
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return NextResponse.json({ ok: true, status: "completed", duplicate: true });
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
    // Race duplicate — no second NDA e-mail.
    if (insErr.code === "23505") {
      console.info(`${NDA_FLOW_LOG} 2. acceptance record unchanged (race duplicate — no insert)`);
      console.info(`${NDA_FLOW_LOG} 12. route response returned`);
      return NextResponse.json({ ok: true, status: "completed", duplicate: true });
    }
    console.info(`${NDA_FLOW_LOG} 12. route response returned`);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  console.info(`${NDA_FLOW_LOG} 2. acceptance record created / updated (insert)`);
  const ndaOutcome: FinalizeNdaAcceptanceDeliveryResult = await finalizeNdaAcceptanceDelivery({
    userId: user.id,
    email: user.email ?? "",
    clientIp: getRequestClientIp(request),
    acceptedAtIso: nowIso,
    agreementVersion: version,
  });
  console.info(`${NDA_FLOW_LOG} 12. route response returned`);
  return NextResponse.json({
    ok: true,
    status: "completed",
    ...ndaDeliveryResponseFields(ndaOutcome, "[onboarding/nda/accept]"),
  });
}
