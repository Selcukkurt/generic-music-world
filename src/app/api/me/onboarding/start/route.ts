import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

export async function POST(request: NextRequest) {
  const { user, error } = await getApiUser(request);
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let supabase;
  try {
    supabase = createServerClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  /** `pending` is non-schema legacy; same intent as `invited` — promote into the real funnel. */
  const preStartPhases = ["invited", "pending"] as const;
  const withPipeline = { access_phase: "onboarding" as const, hub_pipeline_phase: "onboarding" as const };
  let upErr = (
    await supabase.from("app_users").update(withPipeline).eq("id", user.id).in("access_phase", [...preStartPhases])
  ).error;

  if (upErr && isMissingColumnError(upErr.message, "hub_pipeline_phase")) {
    upErr = (
      await supabase
        .from("app_users")
        .update({ access_phase: "onboarding" })
        .eq("id", user.id)
        .in("access_phase", [...preStartPhases])
    ).error;
  }

  if (upErr) {
    if (isMissingColumnError(upErr.message, "access_phase")) {
      return NextResponse.json({ error: "Schema not migrated" }, { status: 503 });
    }
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
