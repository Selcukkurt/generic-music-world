import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getApiUser, requireSystemOwner, createVersionClient } from "@/lib/version/api-auth";
import { getInviteRedirectOrigin } from "@/lib/supabase/env";
import { resendInviteEmail } from "@/lib/rbac/adminUserEmailActions";
import { logRbacUserAction } from "@/lib/rbac/rbacAudit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = createServerClient();
    const { user, error: authError } = await getApiUser(request);
    if (authError) return authError;
    const forbidden = requireSystemOwner(user);
    if (forbidden) return forbidden;

    const { userId } = await params;
    const { data: authData, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !authData?.user?.email) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const email = authData.user.email;
    const origin = getInviteRedirectOrigin(request.nextUrl.origin);
    const redirectTo = `${origin}/auth/callback`;

    const result = await resendInviteEmail(admin, email, redirectTo);

    const vClient = createVersionClient(user!.accessToken);
    await logRbacUserAction(vClient, request, user!, "RBAC_USER_RESEND_INVITE", userId, email, {
      email_dispatch_started: result.emailDispatchStarted === true,
      had_manual_link: Boolean(result.manualLink),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Davet gönderilemedi." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      inviteSent: result.emailDispatchStarted === true,
      manualInviteLink: result.manualLink ?? null,
      user: { id: userId, email },
    });
  } catch (err) {
    console.error("[api/rbac/users/resend-invite]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
