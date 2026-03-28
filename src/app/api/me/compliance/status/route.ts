import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { isPostgrestSchemaError } from "@/lib/supabase/missingColumn";
import { AGREEMENT_KEYS, type AgreementKey } from "@/lib/compliance/constants";
import {
  GM_DNA_ONBOARDING_SECTION_KEYS,
  GM_DNA_SECTION_COUNT,
  type GmDnaSectionKey,
} from "@/content/compliance/gm-dna-sections";

const AGREEMENT_LIST = Object.values(AGREEMENT_KEYS) as AgreementKey[];

export async function GET(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const agreements: Record<AgreementKey, boolean> = {
    confidentiality: false,
    intellectual_property: false,
    gm_dna_final: false,
  };

  const acc = await supabase
    .from("user_agreement_acceptances")
    .select("agreement_key")
    .eq("user_id", user.id);

  if (acc.error) {
    const m = acc.error.message ?? "";
    if (!isPostgrestSchemaError(m)) {
      return NextResponse.json({ error: m }, { status: 500 });
    }
  } else {
    for (const row of acc.data ?? []) {
      const k = row.agreement_key as AgreementKey | undefined;
      if (k && k in agreements) agreements[k] = true;
    }
  }

  const gmDone = new Set<GmDnaSectionKey>();
  const prog = await supabase
    .from("user_gm_dna_section_progress")
    .select("section_key")
    .eq("user_id", user.id);

  if (prog.error) {
    const m = prog.error.message ?? "";
    if (!isPostgrestSchemaError(m)) {
      return NextResponse.json({ error: m }, { status: 500 });
    }
  } else {
    for (const row of prog.data ?? []) {
      const sk = row.section_key as GmDnaSectionKey | undefined;
      if (sk && GM_DNA_ONBOARDING_SECTION_KEYS.includes(sk)) gmDone.add(sk);
    }
  }

  return NextResponse.json({
    agreements,
    agreement_keys_required: AGREEMENT_LIST,
    gm_dna_sections_completed: gmDone.size,
    gm_dna_sections_total: GM_DNA_SECTION_COUNT,
    gm_dna_sections: Object.fromEntries(
      GM_DNA_ONBOARDING_SECTION_KEYS.map((k) => [k, gmDone.has(k)] as const)
    ) as Record<GmDnaSectionKey, boolean>,
  });
}
