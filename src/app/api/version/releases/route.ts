import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { logAudit } from "@/lib/version/audit";

function nextReleaseId() {
  const d = new Date();
  return `REL-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(Date.now() % 100000).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createVersionClient(user.accessToken);
    const { data, error } = await supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[version/releases] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[version/releases] GET error:", err);
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
    const { title, summary, version_tag } = body as {
      title?: string;
      summary?: string;
      version_tag?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const releaseId = nextReleaseId();
    const { data, error } = await supabase
      .from("releases")
      .insert({
        release_id: releaseId,
        version_tag: (version_tag ?? releaseId).trim(),
        title: title.trim(),
        summary: (summary ?? "").trim(),
        status: "DRAFT",
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[version/releases] POST insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await logAudit(supabase, {
        actor_user_id: user!.id,
        actor_role: user!.role,
        action: "RELEASE_CREATED",
        changed_fields: { release_id: releaseId, title: title.trim() },
      });
    } catch (auditErr) {
      console.error("[version/releases] audit log error (non-fatal):", auditErr);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[version/releases] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
