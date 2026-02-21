import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { logAudit } from "@/lib/version/audit";

function nextDeployId() {
  const d = new Date();
  return `DEP-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(Date.now() % 100000).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createVersionClient(user.accessToken);
    const { data, error } = await supabase
      .from("deployments")
      .select("*, release:releases(*)")
      .order("started_at", { ascending: false });

    if (error) {
      console.error("[version/deployments] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[version/deployments] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const body = await request.json();
    const {
      release_id,
      environment,
      commit_sha,
      tag,
      status,
      notes,
    } = body as {
      release_id?: string;
      environment?: string;
      commit_sha?: string;
      tag?: string;
      status?: string;
      notes?: string;
    };

    if (!release_id?.trim()) {
      return NextResponse.json({ error: "release_id is required" }, { status: 400 });
    }
    if (!environment || !["LOCAL", "STAGING", "PRODUCTION"].includes(environment)) {
      return NextResponse.json({ error: "environment must be LOCAL, STAGING, or PRODUCTION" }, { status: 400 });
    }
    const deployStatus = status ?? "SUCCESS";
    if (!["SUCCESS", "FAILED", "IN_PROGRESS"].includes(deployStatus)) {
      return NextResponse.json({ error: "status must be SUCCESS, FAILED, or IN_PROGRESS" }, { status: 400 });
    }

    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .select("id")
      .eq("id", release_id)
      .single();

    if (releaseError || !release) {
      console.error("[version/deployments] release lookup error:", releaseError);
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const deployId = nextDeployId();
    const finishedAt = deployStatus !== "IN_PROGRESS" ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("deployments")
      .insert({
        deploy_id: deployId,
        release_id: release_id.trim(),
        environment,
        commit_sha: (commit_sha ?? "").trim(),
        tag: (tag ?? "").trim(),
        status: deployStatus,
        finished_at: finishedAt,
        notes: (notes ?? "").trim() || null,
        created_by: user!.id,
      })
      .select("*, release:releases(*)")
      .single();

    if (error) {
      console.error("[version/deployments] POST insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await logAudit(supabase, {
        actor_user_id: user!.id,
        actor_role: user!.role,
        action: "DEPLOYMENT_CREATED",
        changed_fields: { deploy_id: deployId, release_id, environment, status: deployStatus },
      });
    } catch (auditErr) {
      console.error("[version/deployments] audit log error (non-fatal):", auditErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[version/deployments] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
