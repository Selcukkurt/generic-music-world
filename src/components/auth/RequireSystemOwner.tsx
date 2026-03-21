"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessRoute, toRBACProfile } from "@/lib/rbac/rbacHelpers";

type RequireSystemOwnerProps = {
  children: React.ReactNode;
};

/**
 * Protects /system/* routes.
 * /system/rbac: SUPER_ADMIN_DEV, CEO, COO allowed.
 * Other /system/*: Super Admin only.
 */
export default function RequireSystemOwner({ children }: RequireSystemOwnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const profile = toRBACProfile(user);
    if (!canAccessRoute(profile, pathname)) {
      router.replace("/forbidden");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
      </div>
    );
  }

  if (!user) return null;
  const profile = toRBACProfile(user);
  if (!canAccessRoute(profile, pathname)) return null;

  return <>{children}</>;
}
