import { NextResponse } from "next/server";

/**
 * Returns the Supabase project ref the app is using.
 * Use this to confirm you're running migrations on the correct project.
 * GET /api/version/debug
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL not set", projectRef: null },
      { status: 500 }
    );
  }
  // Extract project ref from https://<ref>.supabase.co
  const match = url.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.co/);
  const projectRef = match?.[1] ?? null;
  return NextResponse.json({
    projectRef,
    dashboardUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : null,
    nextSteps: projectRef
      ? [
          "1. Open Supabase Dashboard for the project ref above",
          "2. SQL Editor → run scripts/apply-version-migrations.sql",
          "3. Verify: SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('releases','deployments','rollbacks');",
          "4. Expect 3 rows. Wait 1–2 min, then retry /system/release",
        ]
      : null,
  });
}
