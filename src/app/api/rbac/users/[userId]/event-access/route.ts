import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireOwnerOrAdmin, createVersionClient } from "@/lib/version/api-auth";

/** GET: List event_access entries for a user */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireOwnerOrAdmin(user);
    if (forbidden) return forbidden;

    const { userId } = await params;
    const supabase = createVersionClient(user!.accessToken);

    const { data, error } = await supabase
      .from("event_access")
      .select(`
        event_id,
        profile_id,
        access_level,
        etkinlik_events (
          id,
          name,
          date,
          venue,
          status
        )
      `)
      .eq("profile_id", userId)
      .order("event_id");

    if (error) {
      console.error("[api/rbac/users] GET event-access error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries = (data ?? []).map((r: Record<string, unknown>) => ({
      event_id: r.event_id,
      profile_id: r.profile_id,
      access_level: r.access_level,
      event: (r.etkinlik_events as Record<string, unknown>) ?? null,
    }));

    return NextResponse.json(entries);
  } catch (err) {
    console.error("[api/rbac/users] GET event-access error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/** PUT: Replace event_access entries for a user */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireOwnerOrAdmin(user);
    if (forbidden) return forbidden;

    const { userId } = await params;
    const body = await request.json();
    const { entries } = body as { entries?: Array<{ event_id: string; access_level: "view" | "edit" }> };

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "entries array is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);

    const { error: delError } = await supabase
      .from("event_access")
      .delete()
      .eq("profile_id", userId);

    if (delError) {
      console.error("[api/rbac/users] PUT event-access delete error:", delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (entries.length > 0) {
      const inserts = entries.map((e) => ({
        event_id: e.event_id,
        profile_id: userId,
        access_level: e.access_level ?? "view",
      }));
      const { error: insError } = await supabase.from("event_access").insert(inserts);

      if (insError) {
        console.error("[api/rbac/users] PUT event-access insert error:", insError);
        return NextResponse.json({ error: insError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rbac/users] PUT event-access error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
