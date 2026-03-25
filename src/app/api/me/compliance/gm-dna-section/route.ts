import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";
import { GM_DNA_ONBOARDING_SECTION_KEYS } from "@/content/compliance/gm-dna-sections";

export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { section_key?: string } | null;
  const sectionKey = body?.section_key;

  if (!sectionKey || !GM_DNA_ONBOARDING_SECTION_KEYS.includes(sectionKey as typeof GM_DNA_ONBOARDING_SECTION_KEYS[number])) {
    return NextResponse.json({ error: "Invalid section_key" }, { status: 400 });
  }

  const supabase = createVersionClient(user.accessToken);
  const { error: upErr } = await supabase.from("user_gm_dna_section_progress").upsert(
    {
      user_id: user.id,
      section_key: sectionKey,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,section_key" }
  );

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
