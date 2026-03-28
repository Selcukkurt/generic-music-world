import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireOwnerOrAdmin } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { LEGACY_ROLE_TO_LEVEL } from "@/lib/rbac/roleConfig";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";

type Body = {
  user_id?: string;
  personnel_id?: string;
  role_id?: string;
  title?: string;
  department?: string;
};

/**
 * Admin activation: link personnel, assign RBAC role, promote app_users to active Hub access.
 * Target must be in access_phase awaiting_activation (or idempotent if already fully active).
 */
export async function POST(request: NextRequest) {
  const { user: actor, error: authError } = await getApiUser(request);
  if (authError) return authError;
  const forbidden = requireOwnerOrAdmin(actor);
  if (forbidden) return forbidden;

  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const personnelId = typeof body.personnel_id === "string" ? body.personnel_id.trim() : "";
  const roleId = typeof body.role_id === "string" ? body.role_id.trim() : "";
  const titleIn = typeof body.title === "string" ? body.title.trim() : "";
  const departmentIn = typeof body.department === "string" ? body.department.trim() : "";

  if (!userId || !personnelId || !roleId) {
    return NextResponse.json(
      { error: "user_id, personnel_id ve role_id zorunludur." },
      { status: 400 }
    );
  }

  const { data: au, error: auErr } = await supabase
    .from("app_users")
    .select(
      "access_phase, hub_pipeline_phase, hub_access_granted_at, compliance_completed_at, lifecycle_status, is_active"
    )
    .eq("id", userId)
    .maybeSingle();

  if (auErr) {
    console.error("[api/admin/users/activate] read app_users:", auErr.message);
    return NextResponse.json({ error: auErr.message }, { status: 500 });
  }
  if (!au) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const accessPhase = au.access_phase as string | null;
  const hubPhase = au.hub_pipeline_phase as string | null;
  const life = au.lifecycle_status as string | null | undefined;

  console.info("[api/admin/users/activate] before", {
    actorId: actor!.id,
    targetUserId: userId,
    access_phase: accessPhase,
    hub_pipeline_phase: hubPhase,
    lifecycle_status: life ?? null,
  });

  if (life === "archived") {
    return NextResponse.json({ error: "Arşivlenmiş kullanıcı aktive edilemez." }, { status: 400 });
  }

  if (
    accessPhase === "active" &&
    (hubPhase === "active" || au.hub_access_granted_at != null)
  ) {
    console.info("[api/admin/users/activate] idempotent already active", { userId });
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  if (accessPhase !== "awaiting_activation") {
    console.warn("[api/admin/users/activate] invalid access_phase", {
      userId,
      access_phase: accessPhase,
    });
    return NextResponse.json(
      {
        error:
          "Yalnızca access_phase = awaiting_activation olan kullanıcılar bu akışla aktive edilir.",
      },
      { status: 400 }
    );
  }

  if (!au.compliance_completed_at) {
    return NextResponse.json(
      { error: "Uyumluluk onboarding tamamlanmadan aktivasyon yapılamaz." },
      { status: 400 }
    );
  }

  const { data: pers, error: persErr } = await supabase
    .from("personnel")
    .select("id, profile_id")
    .eq("id", personnelId)
    .maybeSingle();

  if (persErr || !pers) {
    return NextResponse.json({ error: "Personel kaydı bulunamadı." }, { status: 404 });
  }

  const persLink = pers.profile_id as string | null;
  if (persLink && persLink !== userId) {
    return NextResponse.json(
      { error: "Bu personel kaydı başka bir kullanıcıya bağlı." },
      { status: 400 }
    );
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from("roles")
    .select("key, role_level")
    .eq("id", roleId)
    .maybeSingle();

  if (roleErr || !roleRow?.key) {
    return NextResponse.json({ error: "Geçersiz role_id." }, { status: 400 });
  }

  const roleKey = String(roleRow.key).toLowerCase();
  const roleLevelFromDb = roleRow.role_level;
  const roleLevel =
    typeof roleLevelFromDb === "number" && !Number.isNaN(roleLevelFromDb)
      ? roleLevelFromDb
      : (LEGACY_ROLE_TO_LEVEL[roleKey] ?? 6);
  const canLogin = roleLevel !== 5;

  await supabase.from("personnel").update({ profile_id: null }).eq("profile_id", userId);

  const { error: linkErr } = await supabase
    .from("personnel")
    .update({ profile_id: userId })
    .eq("id", personnelId);

  if (linkErr) {
    console.error("[api/admin/users/activate] personnel link:", linkErr.message);
    return NextResponse.json(
      { error: linkErr.message || "Personel bağlantısı kurulamadı." },
      { status: 500 }
    );
  }

  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error: urErr } = await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId });
  if (urErr) {
    console.error("[api/admin/users/activate] user_roles:", urErr.message);
    return NextResponse.json({ error: urErr.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const title = titleIn || null;
  const department = departmentIn || null;

  const fullPatch: Record<string, unknown> = {
    access_phase: "active",
    hub_pipeline_phase: "active",
    hub_access_granted_at: now,
    activated_at: now,
    can_login: canLogin,
    role: roleKey,
    role_level: roleLevel,
    title,
    department,
    is_active: true,
  };

  const payloads: Record<string, unknown>[] = [
    fullPatch,
    {
      access_phase: "active",
      hub_pipeline_phase: "active",
      hub_access_granted_at: now,
      activated_at: now,
      can_login: canLogin,
      role: roleKey,
      role_level: roleLevel,
      is_active: true,
    },
    {
      access_phase: "active",
      hub_pipeline_phase: "active",
      hub_access_granted_at: now,
      role: roleKey,
      role_level: roleLevel,
      can_login: canLogin,
    },
    { access_phase: "active", hub_pipeline_phase: "active", hub_access_granted_at: now },
  ];

  let lastErr: { message: string } | null = null;
  for (const payload of payloads) {
    const { error } = await supabase.from("app_users").update(payload).eq("id", userId);
    if (!error) {
      lastErr = null;
      break;
    }
    lastErr = error;
    const msg = error.message ?? "";
    const retryable =
      isPostgrestSchemaError(msg) ||
      isMissingColumnError(msg, "title") ||
      isMissingColumnError(msg, "department") ||
      isMissingColumnError(msg, "can_login") ||
      isMissingColumnError(msg, "hub_access_granted_at") ||
      isMissingColumnError(msg, "activated_at") ||
      isMissingColumnError(msg, "role") ||
      isMissingColumnError(msg, "role_level") ||
      isMissingColumnError(msg, "hub_pipeline_phase") ||
      isMissingColumnError(msg, "access_phase") ||
      isMissingColumnError(msg, "is_active");
    if (!retryable) break;
  }

  if (lastErr) {
    console.error("[api/admin/users/activate] app_users update failed:", lastErr.message);
    return NextResponse.json({ error: lastErr.message }, { status: 500 });
  }

  console.info("[api/admin/users/activate] transitioned", {
    userId,
    access_phase: "active",
    hub_pipeline_phase: "active",
    role_key: roleKey,
    role_level: roleLevel,
    can_login: canLogin,
  });

  return NextResponse.json({
    ok: true,
    access_phase: "active",
    hub_pipeline_phase: "active",
  });
}
