import type { CurrentUser } from "@/lib/auth/mapAuthUser";
import {
  pathAllowedForPhase,
  pathAllowsOnboardingShell,
} from "@/lib/auth/accessPhase";
import {
  getPostHubAuthPath,
  hasHubShellAccess,
  needsHubPendingShell,
  needsOnboardingShell,
  pathAllowsHubPendingShell,
} from "@/lib/auth/hubPipeline";

function homePathForUser(user: CurrentUser): string {
  return getPostHubAuthPath({ role: user.role, u: user });
}

/** Returns redirect target path if current route must change; otherwise null. */
export function getAccessRedirect(pathname: string, user: CurrentUser): string | null {
  if (user.lifecycle_status === "archived") {
    if (!pathname.startsWith("/account-archived")) return "/account-archived";
    return null;
  }

  if (hasHubShellAccess(user)) {
    if (pathname.startsWith("/onboarding") || pathAllowsHubPendingShell(pathname)) {
      return homePathForUser(user);
    }
    if (pathname.startsWith("/activation-pending")) {
      return homePathForUser(user);
    }
    return null;
  }

  if (needsOnboardingShell(user)) {
    if (!pathAllowsOnboardingShell(pathname)) {
      return "/onboarding";
    }
    return null;
  }

  if (needsHubPendingShell(user)) {
    if (!pathAllowsHubPendingShell(pathname)) {
      return "/hub-pending";
    }
    return null;
  }

  if (user.access_phase === "awaiting_activation") {
    if (!pathAllowedForPhase(pathname, user.access_phase, user.lifecycle_status)) {
      return "/activation-pending";
    }
    return null;
  }

  if (pathname.startsWith("/activation-pending")) {
    return homePathForUser(user);
  }
  if (pathname.startsWith("/onboarding")) {
    return homePathForUser(user);
  }
  if (pathAllowsHubPendingShell(pathname)) {
    return homePathForUser(user);
  }

  return null;
}
