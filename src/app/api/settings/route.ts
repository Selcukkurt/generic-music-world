import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { insertAuditLog } from "@/lib/audit/insert";
import type { SystemSettings } from "@/lib/settings/types";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createVersionClient(user!.accessToken);
    const { data, error } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", 1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ settings: null });
      }
      console.error("[api/settings] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data?.settings ?? null });
  } catch (err) {
    console.error("[api/settings] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { settings, changedFields } = body as {
      settings: SystemSettings;
      changedFields?: string[];
    };

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "settings is required" }, { status: 400 });
    }

    const supabase = createVersionClient(user!.accessToken);

    const { error: updateError } = await supabase
      .from("system_settings")
      .update({
        settings: settings as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      console.error("[api/settings] PUT update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    try {
      await insertAuditLog(supabase, {
        category: "settings",
        action: "SYSTEM_SETTINGS_UPDATED",
        message: "Sistem ayarları güncellendi",
        actorUserId: user!.id,
        actorEmail: user!.email ?? undefined,
        actorRole: user!.role,
        targetEntity: "system_settings",
        targetId: "1",
        status: "success",
        metadata: changedFields ? { changed_fields: changedFields } : undefined,
        requestIp: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
        requestUserAgent: request.headers.get("user-agent") ?? undefined,
      });
    } catch (auditErr) {
      console.error("[api/settings] audit log error (non-fatal):", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/settings] PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
