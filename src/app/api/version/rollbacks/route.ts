import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { logAudit } from "@/lib/version/audit";

function nextRollbackId() {
  const n = Math.floor(Math.random() * 900) + 100;
  return `RB-${String(n).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createVersionClient(user.accessToken);
    const { data, error } = await supabase
      .from("rollbacks")
      .select("*")
      .order("executed_at", { ascending: false });

    if (error) {
      console.error("[version/rollbacks] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[version/rollbacks] GET error:", err);
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
    const { from_deploy_id, to_deploy_id, reason } = body as {
      from_deploy_id?: string;
      to_deploy_id?: string;
      reason?: string;
    };

    if (!from_deploy_id?.trim()) {
      return NextResponse.json({ error: "from_deploy_id is required" }, { status: 400 });
    }
    if (!to_deploy_id?.trim()) {
      return NextResponse.json({ error: "to_deploy_id is required" }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const [fromRes, toRes] = await Promise.all([
      supabase.from("deployments").select("id").eq("id", from_deploy_id).single(),
      supabase.from("deployments").select("id").eq("id", to_deploy_id).single(),
    ]);

    if (!fromRes.data) {
      return NextResponse.json({ error: "from_deploy not found" }, { status: 404 });
    }
    if (!toRes.data) {
      return NextResponse.json({ error: "to_deploy not found" }, { status: 404 });
    }

    let rollbackId = nextRollbackId();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("rollbacks")
        .select("id")
        .eq("rollback_id", rollbackId)
        .single();
      if (!existing) break;
      rollbackId = nextRollbackId();
      attempts++;
    }

    const { data, error } = await supabase
      .from("rollbacks")
      .insert({
        rollback_id: rollbackId,
        from_deploy_id: from_deploy_id.trim(),
        to_deploy_id: to_deploy_id.trim(),
        reason: reason.trim(),
        executed_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[version/rollbacks] POST insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await logAudit(supabase, {
        actor_user_id: user!.id,
        actor_role: user!.role,
        action: "ROLLBACK_CREATED",
        changed_fields: { rollback_id: rollbackId, from_deploy_id, to_deploy_id },
      });
    } catch (auditErr) {
      console.error("[version/rollbacks] audit log error (non-fatal):", auditErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[version/rollbacks] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
