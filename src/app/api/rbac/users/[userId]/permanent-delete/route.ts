import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { createServerClient } from "@/lib/supabase/server";
import { logRbacUserAction } from "@/lib/rbac/rbacAudit";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Permanent delete: remove Supabase Auth user, tombstone app_users, clear user_roles.
 * system_owner only. confirmEmail must match target user email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const { userId } = await params;
    if (user!.id === userId) {
      return NextResponse.json({ error: "Kendi hesabınızı kalıcı olarak silemezsiniz." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { confirmEmail, reason } = body as { confirmEmail?: string; reason?: string };

    if (!confirmEmail || typeof confirmEmail !== "string" || !confirmEmail.trim()) {
      return NextResponse.json({ error: "confirmEmail gerekli." }, { status: 400 });
    }

    const admin = createServerClient();

    const { data: authData, error: getAuthErr } = await admin.auth.admin.getUserById(userId);
    if (getAuthErr || !authData?.user?.email) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya zaten kaldırılmış." },
        { status: 404 }
      );
    }

    const targetEmail = authData.user.email;
    if (normalizeEmail(confirmEmail) !== normalizeEmail(targetEmail)) {
      return NextResponse.json({ error: "E-posta onayı eşleşmiyor." }, { status: 400 });
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      console.error("[permanent-delete] auth.admin.deleteUser:", delAuthErr.message);
      return NextResponse.json(
        { error: delAuthErr.message || "Auth kullanıcısı silinemedi." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const tombstone = { deleted_at: now, deleted_by: user!.id };

    const { error: upErr } = await admin.from("app_users").update(tombstone).eq("id", userId);
    let hardDeletedAppUser = false;
    if (upErr && isMissingColumnError(upErr.message, "deleted_at")) {
      const { error: delErr } = await admin.from("app_users").delete().eq("id", userId);
      if (delErr) {
        console.error("[permanent-delete] app_users delete fallback:", delErr.message);
        return NextResponse.json(
          {
            error: "Auth silindi; uygulama kaydı temizlenemedi. Destek ekibine bildirin.",
            code: "APP_USERS_CLEANUP",
          },
          { status: 500 }
        );
      }
      hardDeletedAppUser = true;
    } else if (upErr) {
      console.error("[permanent-delete] app_users tombstone:", upErr.message);
      return NextResponse.json(
        { error: "Auth silindi; uygulama kaydı güncellenemedi. Destek ekibine bildirin.", code: "APP_USERS_TOMBSTONE" },
        { status: 500 }
      );
    }

    if (!hardDeletedAppUser) {
      const { error: urErr } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (urErr) {
        console.warn("[permanent-delete] user_roles cleanup (non-fatal):", urErr.message);
      }
    }

    const vClient = createVersionClient(user!.accessToken);
    await logRbacUserAction(vClient, request, user!, "RBAC_USER_PERMANENT_DELETE", userId, targetEmail, {
      deleted_email: targetEmail,
      deleted_user_id: userId,
      actor_user_id: user!.id,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      deletedUserId: userId,
      deletedEmail: targetEmail,
    });
  } catch (err) {
    console.error("[api/rbac/users/permanent-delete]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
