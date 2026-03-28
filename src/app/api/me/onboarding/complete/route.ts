import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";
import { AGREEMENT_KEYS, type AgreementKey } from "@/lib/compliance/constants";
import { GM_DNA_ONBOARDING_SECTION_KEYS, type GmDnaSectionKey } from "@/content/compliance/gm-dna-sections";

type Body = {
  firstName?: string;
  lastName?: string;
  /** @deprecated Prefer firstName + lastName; used as fallback when split fields absent. */
  fullName?: string;
  title?: string;
  department?: string;
};

const REQUIRED_AGREEMENTS: AgreementKey[] = [
  AGREEMENT_KEYS.confidentiality,
  AGREEMENT_KEYS.intellectual_property,
  AGREEMENT_KEYS.gm_dna_final,
];

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

  let firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  let lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  let titleIn = typeof body.title === "string" ? body.title.trim() : "";
  let departmentIn = typeof body.department === "string" ? body.department.trim() : "";

  if (!firstName || !lastName) {
    const legacy = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (legacy) {
      const p = legacy.split(/\s+/).filter(Boolean);
      firstName = firstName || (p[0] ?? "");
      lastName = lastName || (p.length > 1 ? p.slice(1).join(" ") : p[0] ?? "");
    }
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
    onboarding_status?: string | null;
    compliance_completed_at?: string | null;
    hub_pipeline_phase?: string | null;
  };

  function rowIndicatesOnboardingComplete(r: OnboardingRow): boolean {
    if (r.compliance_completed_at) return true;
    if (r.onboarding_completed_at) return true;
    const s = typeof r.onboarding_status === "string" ? r.onboarding_status.trim().toLowerCase() : "";
    return s === "completed";
  }

  /** Pre-compliance funnel phases allowed to finish onboarding, plus legacy `active` misalignment (backfill set active before compliance existed). */
  function canFinishComplianceFromAccessPhase(phase: string | null): boolean {
    const p = phase ?? "";
    return p === "invited" || p === "onboarding" || p === "active";
  }

  let row: OnboardingRow | null = null;

  /** Narrower SELECTs when optional columns are missing — never repeat a failed column name in the next try. */
  const rowSelectAttempts = [
    "access_phase, onboarding_completed_at, onboarding_status, compliance_completed_at, hub_pipeline_phase",
    "access_phase, onboarding_completed_at, compliance_completed_at, hub_pipeline_phase",
    "access_phase, compliance_completed_at, hub_pipeline_phase",
    "access_phase",
  ];

  for (const cols of rowSelectAttempts) {
    const sel = await supabase.from("app_users").select(cols).eq("id", user.id).maybeSingle();
    if (!sel.error && sel.data) {
      const d = sel.data as unknown as Record<string, unknown>;
      row = {
        access_phase: d.access_phase as string | null,
        onboarding_completed_at: (d.onboarding_completed_at as string | null | undefined) ?? null,
        onboarding_status: (d.onboarding_status as string | null | undefined) ?? null,
        compliance_completed_at: (d.compliance_completed_at as string | null | undefined) ?? null,
        hub_pipeline_phase: (d.hub_pipeline_phase as string | null | undefined) ?? null,
      };
      if (row.hub_pipeline_phase == null) {
        row.hub_pipeline_phase = "invited";
      }
      break;
    }
    if (sel.error) {
      const msg = sel.error.message ?? "";
      const retry =
        isPostgrestSchemaError(msg) ||
        isMissingColumnError(msg, "onboarding_completed_at") ||
        isMissingColumnError(msg, "onboarding_status") ||
        isMissingColumnError(msg, "compliance_completed_at") ||
        isMissingColumnError(msg, "hub_pipeline_phase") ||
        isMissingColumnError(msg, "access_phase");
      if (!retry) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  }

  if (!row) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const phase = row.access_phase as string | null;
  console.info("[onboarding/complete] state before", {
    userId: user.id,
    access_phase: phase,
    hub_pipeline_phase: row.hub_pipeline_phase,
    compliance_completed_at: !!row.compliance_completed_at,
    onboarding_completed_at: !!row.onboarding_completed_at,
    onboarding_status: row.onboarding_status ?? null,
  });

  if (rowIndicatesOnboardingComplete(row)) {
    console.info("[onboarding/complete] idempotent already completed", { userId: user.id, access_phase: phase });
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  if (!canFinishComplianceFromAccessPhase(phase)) {
    console.warn("[onboarding/complete] rejected access_phase", { userId: user.id, access_phase: phase });
    return NextResponse.json(
      { error: "Onboarding bu hesap için uygulanamaz (erişim aşaması uygun değil)." },
      { status: 400 }
    );
  }

  const { data: accRows, error: accErr } = await supabase
    .from("user_agreement_acceptances")
    .select("agreement_key")
    .eq("user_id", user.id);

  if (accErr) {
    if (isPostgrestSchemaError(accErr.message)) {
      return NextResponse.json(
        {
          error:
            "Uyumluluk tabloları eksik veya şema güncel değil (user_agreement_acceptances). Veritabanı migrasyonlarını uygulayın.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const accepted = new Set((accRows ?? []).map((r) => r.agreement_key as string));
  for (const key of REQUIRED_AGREEMENTS) {
    if (!accepted.has(key)) {
      return NextResponse.json(
        { error: "Eksik onay: tüm sözleşme ve GM DNA onayları tamamlanmalıdır." },
        { status: 400 }
      );
    }
  }

  const { data: dnaRows, error: dnaErr } = await supabase
    .from("user_gm_dna_section_progress")
    .select("section_key")
    .eq("user_id", user.id);

  if (dnaErr) {
    if (isPostgrestSchemaError(dnaErr.message)) {
      return NextResponse.json(
        {
          error:
            "GM DNA bölüm tablosu eksik veya şema güncel değil (user_gm_dna_section_progress). Veritabanı migrasyonlarını uygulayın.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: dnaErr.message }, { status: 500 });
  }

  const dnaDone = new Set((dnaRows ?? []).map((r) => r.section_key as GmDnaSectionKey));
  for (const key of GM_DNA_ONBOARDING_SECTION_KEYS) {
    if (!dnaDone.has(key)) {
      return NextResponse.json(
        { error: "GM DNA: tüm bölümler işaretlenmelidir." },
        { status: 400 }
      );
    }
  }

  const { data: authData } = await supabase.auth.admin.getUserById(user.id);
  const existingMeta = (authData?.user?.user_metadata ?? {}) as Record<string, unknown>;

  type ProfileCols = {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    title?: string | null;
    department?: string | null;
  };

  let profileRow: ProfileCols | null = null;
  const profSel = await supabase
    .from("app_users")
    .select("first_name, last_name, full_name, title, department")
    .eq("id", user.id)
    .maybeSingle();
  if (!profSel.error && profSel.data) {
    profileRow = profSel.data as ProfileCols;
  } else if (
    profSel.error &&
    (isPostgrestSchemaError(profSel.error.message) ||
      isMissingColumnError(profSel.error.message, "first_name") ||
      isMissingColumnError(profSel.error.message, "last_name"))
  ) {
    const fallback = await supabase
      .from("app_users")
      .select("full_name, title, department")
      .eq("id", user.id)
      .maybeSingle();
    if (!fallback.error && fallback.data) {
      profileRow = fallback.data as ProfileCols;
    }
  }

  if (!firstName) {
    firstName = profileRow?.first_name?.trim() ?? "";
  }
  if (!lastName) {
    lastName = profileRow?.last_name?.trim() ?? "";
  }
  if ((!firstName || !lastName) && profileRow?.full_name?.trim()) {
    const p = profileRow.full_name.trim().split(/\s+/).filter(Boolean);
    if (!firstName) firstName = p[0] ?? "";
    if (!lastName) lastName = p.length > 1 ? p.slice(1).join(" ") : "";
  }
  if (!firstName || !lastName) {
    const mf = existingMeta["first_name"];
    const ml = existingMeta["last_name"];
    const mfStr = typeof mf === "string" ? mf.trim() : "";
    const mlStr = typeof ml === "string" ? ml.trim() : "";
    if (!firstName) firstName = mfStr;
    if (!lastName) lastName = mlStr;
  }
  if ((!firstName || !lastName) && typeof existingMeta["full_name"] === "string") {
    const p = existingMeta["full_name"].trim().split(/\s+/).filter(Boolean);
    if (!firstName) firstName = p[0] ?? "";
    if (!lastName) lastName = p.length > 1 ? p.slice(1).join(" ") : "";
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Profilde veya hesap kaydında ad / soyad bulunamadı. Yöneticinize başvurun." },
      { status: 400 }
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const title = titleIn || profileRow?.title?.trim() || "";
  const department = departmentIn || profileRow?.department?.trim() || "";

  const now = new Date().toISOString();

  const mergedMeta = {
    ...existingMeta,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    title,
    department,
  };

  const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: mergedMeta,
  });
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const profile = {
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    title: title ? title : null,
    department: department ? department : null,
  };

  const institutional = {
    onboarding_completed_at: now,
    onboarding_status: "completed" as const,
    compliance_completed_at: now,
    hub_pipeline_phase: "awaiting_personnel" as const,
    access_phase: "awaiting_activation" as const,
  };
  const institutionalNoAccessPhase = {
    onboarding_completed_at: now,
    onboarding_status: "completed" as const,
    compliance_completed_at: now,
    hub_pipeline_phase: "awaiting_personnel" as const,
  };

  const attempts: Record<string, unknown>[] = [
    { ...profile, ...institutional },
    {
      full_name: fullName,
      title: title || null,
      department: department || null,
      ...institutional,
    },
    { full_name: fullName, ...institutional },
    { ...profile, ...institutionalNoAccessPhase },
    {
      full_name: fullName,
      title: title || null,
      department: department || null,
      ...institutionalNoAccessPhase,
    },
    { full_name: fullName, ...institutionalNoAccessPhase },
    {
      full_name: fullName,
      onboarding_completed_at: now,
      onboarding_status: "completed",
      compliance_completed_at: now,
    },
    {
      full_name: fullName,
      onboarding_completed_at: now,
      compliance_completed_at: now,
    },
    { full_name: fullName, onboarding_completed_at: now },
  ];

  let upErr: { message: string } | null = null;
  try {
    for (const payload of attempts) {
      const { error } = await supabase.from("app_users").update(payload).eq("id", user.id);
      if (!error) {
        upErr = null;
        break;
      }
      upErr = error;
      const msg = error.message ?? "";
      const retryable =
        isPostgrestSchemaError(msg) ||
        isMissingColumnError(msg, "first_name") ||
        isMissingColumnError(msg, "last_name") ||
        isMissingColumnError(msg, "title") ||
        isMissingColumnError(msg, "department") ||
        isMissingColumnError(msg, "compliance_completed_at") ||
        isMissingColumnError(msg, "hub_pipeline_phase") ||
        isMissingColumnError(msg, "onboarding_completed_at") ||
        isMissingColumnError(msg, "onboarding_status") ||
        isMissingColumnError(msg, "access_phase");
      if (!retryable) break;
    }
  } catch (e) {
    console.error("[onboarding/complete] app_users.update unexpected error:", e);
    return NextResponse.json(
      {
        error:
          "Kayıt güncellenemedi (beklenmeyen sunucu hatası). Lütfen tekrar deneyin veya yöneticinize bildirin.",
        code: "onboarding_update_exception",
      },
      { status: 503 }
    );
  }

  if (upErr) {
    console.error("[onboarding/complete] app_users.update failed after retries:", upErr.message);
    const migrationLikely =
      isPostgrestSchemaError(upErr.message) ||
      isMissingColumnError(upErr.message, "onboarding_completed_at") ||
      isMissingColumnError(upErr.message, "onboarding_status") ||
      isMissingColumnError(upErr.message, "compliance_completed_at") ||
      isMissingColumnError(upErr.message, "hub_pipeline_phase") ||
      isMissingColumnError(upErr.message, "access_phase");
    if (migrationLikely) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması bu ortamda güncel değil (çoğunlukla app_users sütunları eksik). Supabase SQL Editor’de onboarding sütunlarını ekleyin; .env içindeki proje ile aynı veritabanı olduğundan emin olun.",
          code: "schema_migration_required",
          details: process.env.NODE_ENV === "development" ? upErr.message : undefined,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  console.info("[onboarding/complete] transitioned", {
    userId: user.id,
    access_phase: "awaiting_activation",
    hub_pipeline_phase: "awaiting_personnel",
    onboarding_status: "completed",
  });

  return NextResponse.json({ ok: true });
}
