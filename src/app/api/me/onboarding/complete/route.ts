import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";

type Body = {
  fullName?: string;
  title?: string;
  department?: string;
};

export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const department = typeof body.department === "string" ? body.department.trim() : "";

  if (!fullName) {
    return NextResponse.json({ error: "Ad soyad gerekli" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  type OnboardingRow = {
    access_phase: string | null;
    onboarding_completed_at?: string | null;
  };

  let row: OnboardingRow | null = null;

  const rowFull = await supabase
    .from("app_users")
    .select("access_phase, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!rowFull.error && rowFull.data) {
    row = rowFull.data as unknown as OnboardingRow;
  } else if (
    rowFull.error &&
    (isMissingColumnError(rowFull.error.message, "onboarding_completed_at") ||
      isPostgrestSchemaError(rowFull.error.message))
  ) {
    const rowCore = await supabase
      .from("app_users")
      .select("access_phase")
      .eq("id", user.id)
      .maybeSingle();
    if (rowCore.error) {
      return NextResponse.json({ error: rowCore.error.message }, { status: 500 });
    }
    if (!rowCore.data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    row = {
      access_phase: rowCore.data.access_phase as string | null,
      onboarding_completed_at: null,
    };
  } else if (rowFull.error) {
    return NextResponse.json({ error: rowFull.error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (row.onboarding_completed_at) {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  const phase = row.access_phase as string | null;
  if (phase !== "invited" && phase !== "onboarding") {
    return NextResponse.json(
      { error: "Onboarding bu hesap için uygulanamaz (erişim aşaması uygun değil)." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data: authData } = await supabase.auth.admin.getUserById(user.id);
  const existingMeta = (authData?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const mergedMeta = {
    ...existingMeta,
    full_name: fullName,
    title,
    department,
  };

  const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: mergedMeta,
  });
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const payloadWithProfile = {
    full_name: fullName,
    title: title || null,
    department: department || null,
    onboarding_completed_at: now,
    access_phase: "active" as const,
    activated_at: now,
  };

  const payloadCore = {
    full_name: fullName,
    onboarding_completed_at: now,
    access_phase: "active" as const,
    activated_at: now,
  };

  let upErr = (await supabase.from("app_users").update(payloadWithProfile).eq("id", user.id)).error;

  if (
    upErr &&
    (isMissingColumnError(upErr.message, "title") || isMissingColumnError(upErr.message, "department"))
  ) {
    upErr = (await supabase.from("app_users").update(payloadCore).eq("id", user.id)).error;
  }

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
