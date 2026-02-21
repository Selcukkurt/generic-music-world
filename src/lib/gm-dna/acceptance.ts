import { supabaseBrowser } from "@/lib/supabase/client";

export function formatAcceptedAt(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export type GmDnaAcceptance = {
  gm_dna_accepted_version: string | null;
  gm_dna_accepted_at: string | null;
  gm_dna_acceptance_source: string | null;
};

const GM_DNA_VERSION = "2.0";
const ACCEPTANCE_SOURCE = "gm-dna-page";

export async function getGmDnaAcceptance(userId: string): Promise<GmDnaAcceptance | null> {
  const { data, error } = await supabaseBrowser
    .from("profiles")
    .select("gm_dna_accepted_version, gm_dna_accepted_at, gm_dna_acceptance_source")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function saveGmDnaAcceptance(userId: string): Promise<GmDnaAcceptance> {
  const now = new Date().toISOString();
  const payload = {
    id: userId,
    gm_dna_accepted_version: GM_DNA_VERSION,
    gm_dna_accepted_at: now,
    gm_dna_acceptance_source: ACCEPTANCE_SOURCE,
    updated_at: now,
  };

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("gm_dna_accepted_version, gm_dna_accepted_at, gm_dna_acceptance_source")
    .single();

  if (error) throw error;
  return data;
}

export { GM_DNA_VERSION };
