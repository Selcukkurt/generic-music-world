import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireOwnerOrAdmin } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";

export type PersonnelCandidate = { id: string; full_name: string | null; email: string | null };

/**
 * Unlinked personnel rows for "Assign personnel" during user activation (admin / owner / COO).
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getApiUser(request);
  if (authError) return authError;
  const forbidden = requireOwnerOrAdmin(user);
  if (forbidden) return forbidden;

  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("personnel")
    .select("id, full_name, email, first_name, last_name, profile_id")
    .is("profile_id", null)
    .eq("is_active", true)
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(400);

  if (error) {
    console.error("[api/admin/personnel-candidates]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list: PersonnelCandidate[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const fn = (r.first_name as string) ?? "";
    const ln = (r.last_name as string) ?? "";
    const full = (r.full_name as string)?.trim();
    const display = full || [fn, ln].filter(Boolean).join(" ").trim() || null;
    return {
      id: r.id as string,
      full_name: display,
      email: (r.email as string) ?? null,
    };
  });

  return NextResponse.json(list);
}
