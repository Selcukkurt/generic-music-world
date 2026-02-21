import { NextRequest, NextResponse } from "next/server";
import { getApiUser, createVersionClient } from "@/lib/version/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createVersionClient(user.accessToken);

    const [releasesRes, deploymentsRes] = await Promise.all([
      supabase.from("releases").select("*").order("created_at", { ascending: false }).limit(10),
      supabase
        .from("deployments")
        .select("*, release:releases(*)")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

    if (releasesRes.error) {
      console.error("[version/overview] releases error:", releasesRes.error);
      return NextResponse.json({ error: releasesRes.error.message }, { status: 500 });
    }
    if (deploymentsRes.error) {
      console.error("[version/overview] deployments error:", deploymentsRes.error);
      return NextResponse.json({ error: deploymentsRes.error.message }, { status: 500 });
    }

    const deployments = deploymentsRes.data ?? [];
    const lastDeployment = deployments.find((d) => d.status === "SUCCESS") ?? null;
    const productionDeploy = deployments.find(
      (d) => d.environment === "PRODUCTION" && d.status === "SUCCESS"
    ) ?? null;

    return NextResponse.json({
      lastRelease: releasesRes.data?.[0] ?? null,
      lastDeployment: lastDeployment,
      currentProduction: productionDeploy
        ? {
            tag: productionDeploy.tag,
            commit_sha: productionDeploy.commit_sha,
            deployed_at: productionDeploy.finished_at ?? productionDeploy.started_at,
            release: productionDeploy.release,
          }
        : null,
      releases: releasesRes.data ?? [],
      deployments,
    });
  } catch (err) {
    console.error("[version/overview] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
