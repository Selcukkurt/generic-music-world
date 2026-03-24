import type { SupabaseClient } from "@supabase/supabase-js";

/** Result shape aligned with invite flow — never implies guaranteed mailbox delivery. */
export type AdminEmailActionResult = {
  success: boolean;
  /** True when Supabase accepted an outbound e-mail send (delivery not verified). */
  emailDispatchStarted?: boolean;
  manualLink?: string | null;
  error?: string;
};

/**
 * Resend invite e-mail (or generate manual invite link on failure).
 * Same semantics as `POST /api/rbac/users/invite` fallback path.
 */
export async function resendInviteEmail(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
): Promise<AdminEmailActionResult> {
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {},
  });

  if (!inviteError) {
    return { success: true, emailDispatchStarted: true };
  }

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (linkErr) {
    return { success: false, error: linkErr.message };
  }

  const props = linkData as { properties?: { action_link?: string } } | null;
  const manualLink = props?.properties?.action_link ?? null;
  return {
    success: true,
    emailDispatchStarted: false,
    manualLink,
  };
}

/** Generate invite link without sending e-mail. */
export async function generateInviteLinkOnly(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
): Promise<AdminEmailActionResult> {
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  if (linkErr) {
    return { success: false, error: linkErr.message };
  }
  const props = linkData as { properties?: { action_link?: string } } | null;
  return {
    success: true,
    emailDispatchStarted: false,
    manualLink: props?.properties?.action_link ?? null,
  };
}

/**
 * Generate password recovery link (admin). Does not assert that Supabase sent an e-mail.
 * User completes reset via your Site URL / redirect URLs (e.g. `/auth/callback`).
 */
export async function generatePasswordRecoveryLink(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
): Promise<AdminEmailActionResult> {
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (linkErr) {
    return { success: false, error: linkErr.message };
  }
  const props = linkData as { properties?: { action_link?: string } } | null;
  return {
    success: true,
    emailDispatchStarted: false,
    manualLink: props?.properties?.action_link ?? null,
  };
}
