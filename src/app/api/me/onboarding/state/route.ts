import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { isMissingColumnError, isPostgrestSchemaError } from "@/lib/supabase/missingColumn";

const SELECT_STATE_FULL =
  "full_name, email, role, role_level, title, department, access_phase, onboarding_completed_at";
const SELECT_STATE_NO_PROFILE =
  "full_name, email, role, role_level, access_phase, onboarding_completed_at";
const SELECT_STATE_CORE = "full_name, email, role, role_level, access_phase";

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

  type Row = {
    full_name: string | null;
    email: string | null;
    role: string | null;
    role_level: number | null;
    title?: string | null;
    department?: string | null;
    access_phase: string | null;
    onboarding_completed_at?: string | null;
  };

  const attempts = [SELECT_STATE_FULL, SELECT_STATE_NO_PROFILE, SELECT_STATE_CORE];
  let d: Row | null = null;

  for (const columns of attempts) {
    const sel = await supabase.from("app_users").select(columns).eq("id", user.id).maybeSingle();
    if (!sel.error && sel.data) {
      d = sel.data as unknown as Row;
      break;
    }
    if (sel.error) {
      const m = sel.error.message ?? "";
      const retry =
        isPostgrestSchemaError(m) ||
        isMissingColumnError(m, "title") ||
        isMissingColumnError(m, "department") ||
        isMissingColumnError(m, "onboarding_completed_at") ||
        isMissingColumnError(m, "access_phase");
      if (!retry) {
        return NextResponse.json({ error: m }, { status: 500 });
      }
    }
  }

  if (!d) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    full_name: d.full_name,
    email: d.email ?? user.email,
    role: d.role,
    role_level: d.role_level,
    title: d.title ?? null,
    department: d.department ?? null,
    access_phase: d.access_phase,
    onboarding_completed_at: d.onboarding_completed_at ?? null,
  });
}
