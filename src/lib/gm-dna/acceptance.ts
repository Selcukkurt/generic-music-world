import { supabaseBrowser } from "@/lib/supabase/client";
import { AGREEMENT_KEYS, AGREEMENT_VERSIONS } from "@/lib/compliance/constants";

export function formatAcceptedAt(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * UI shape for the final GM DNA legal acceptance (agreement_key `gm_dna_final`).
 * Backed by `user_agreement_acceptances`, not `profiles` columns.
 */
export type GmDnaAcceptance = {
  gm_dna_accepted_version: string | null;
  gm_dna_accepted_at: string | null;
};

const GM_DNA_AGREEMENT_KEY = AGREEMENT_KEYS.gm_dna_final;

export async function getGmDnaAcceptance(userId: string): Promise<GmDnaAcceptance | null> {
  const { data, error } = await supabaseBrowser
    .from("user_agreement_acceptances")
    .select("agreement_version, accepted_at")
    .eq("user_id", userId)
    .eq("agreement_key", GM_DNA_AGREEMENT_KEY)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    gm_dna_accepted_version: data.agreement_version ?? null,
    gm_dna_accepted_at: data.accepted_at ?? null,
  };
}

export async function saveGmDnaAcceptance(userId: string): Promise<GmDnaAcceptance> {
  const version = AGREEMENT_VERSIONS[GM_DNA_AGREEMENT_KEY];
  const { data, error } = await supabaseBrowser
    .from("user_agreement_acceptances")
    .insert({
      user_id: userId,
      agreement_key: GM_DNA_AGREEMENT_KEY,
      agreement_version: version,
    })
    .select("agreement_version, accepted_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const again = await getGmDnaAcceptance(userId);
      if (again) return again;
    }
    throw error;
  }
  return {
    gm_dna_accepted_version: data.agreement_version ?? null,
    gm_dna_accepted_at: data.accepted_at ?? null,
  };
}

/** Content document version for display copy (legal agreement row uses AGREEMENT_VERSIONS). */
export { GM_DNA_CONTENT_VERSION as GM_DNA_VERSION } from "@/lib/compliance/constants";
