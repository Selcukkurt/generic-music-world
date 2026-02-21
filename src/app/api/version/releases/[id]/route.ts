import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { logAudit } from "@/lib/version/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !["READY", "DEPLOYED", "ROLLED_BACK"].includes(status)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("releases")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      console.error("[version/releases/[id]] fetch error:", fetchError);
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    if (status === "READY" && existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT can transition to READY" }, { status: 400 });
    }

    if (status === "DEPLOYED") {
      if (existing.status !== "READY") {
        return NextResponse.json({ error: "Only READY can transition to DEPLOYED" }, { status: 400 });
      }
      const { data: prodDeploy } = await supabase
        .from("deployments")
        .select("id")
        .eq("release_id", id)
        .eq("environment", "PRODUCTION")
        .eq("status", "SUCCESS")
        .limit(1)
        .single();
      if (!prodDeploy) {
        return NextResponse.json(
          { error: "No successful PRODUCTION deployment exists for this release" },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "READY" || status === "DEPLOYED") {
      updatePayload.approved_by = user!.id;
      updatePayload.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("releases")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[version/releases/[id]] update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await logAudit(supabase, {
        actor_user_id: user!.id,
        actor_role: user!.role,
        action: "RELEASE_STATUS_CHANGED",
        changed_fields: { release_id: existing.release_id, from: existing.status, to: status },
      });
    } catch (auditErr) {
      console.error("[version/releases/[id]] audit log error (non-fatal):", auditErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[version/releases/[id]] PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
