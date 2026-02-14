"use client";

import { canAccess } from "@/lib/rbac/canAccess";
import type { Action, Resource } from "@/lib/rbac/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AccessDenied from "./AccessDenied";

type RequireAccessProps = {
  resource: Resource;
  action: Action;
  children: React.ReactNode;
};

/**
 * Renders children if user has access; otherwise renders AccessDenied.
 */
export default function RequireAccess({
  resource,
  action,
  children,
}: RequireAccessProps) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied />;
  }

  if (!canAccess(user.role, resource, action)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
