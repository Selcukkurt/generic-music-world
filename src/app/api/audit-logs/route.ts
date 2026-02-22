import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import type { LogEvent } from "@/lib/audit/types";

type AuditLogRow = {
  id: string;
  created_at: string;
  severity: string;
  category: string;
  action: string;
  message: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  meta: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
};

function rowToEvent(row: AuditLogRow): LogEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    severity: row.severity as LogEvent["severity"],
    category: row.category as LogEvent["category"],
    action: row.action,
    message: row.message ?? undefined,
    actor: {
      id: row.actor_user_id ?? undefined,
      email: row.actor_email ?? undefined,
      role: row.actor_role ?? undefined,
    },
    target:
      row.target_type || row.target_id
        ? { entity: row.target_type ?? "", id: row.target_id ?? undefined }
        : undefined,
    status: row.status as LogEvent["status"],
    metadata: row.meta ?? undefined,
    request:
      row.ip || row.user_agent
        ? { ip: row.ip ?? undefined, userAgent: row.user_agent ?? undefined }
        : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));
    const search = searchParams.get("search")?.trim();
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();
    const severities = searchParams.get("severities")?.split(",").filter(Boolean);
    const category = searchParams.get("category")?.trim();
    const status = searchParams.get("status")?.trim();
    const actor = searchParams.get("actor")?.trim();

    let query = supabase
      .from("audit_logs")
      .select("id,created_at,severity,category,action,message,actor_user_id,actor_email,actor_role,target_type,target_id,status,meta,ip,user_agent", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }
    if (severities?.length) {
      query = query.in("severity", severities);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (actor) {
      const safeActor = actor.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.ilike("actor_email", `%${safeActor}%`);
    }

    if (search) {
      const safeSearch = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(
        `action.ilike.%${safeSearch}%,message.ilike.%${safeSearch}%,actor_email.ilike.%${safeSearch}%,target_type.ilike.%${safeSearch}%`
      );
    }

    const { data: rows, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("[api/audit-logs] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const events = (rows ?? []).map(rowToEvent);

    return NextResponse.json({
      events,
      total: count ?? events.length,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[api/audit-logs] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
