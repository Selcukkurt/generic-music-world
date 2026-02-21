"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessSystem } from "@/lib/rbac/canAccess";

type RequireSystemOwnerProps = {
  children: React.ReactNode;
};

/**
 * Protects /system/* routes. Only SYSTEM_OWNER can access.
 * CEO and others get 403 or redirect to dashboard.
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
    if (!canAccessSystem(user.role)) {
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

  if (!user || !canAccessSystem(user.role)) {
    return null;
  }

  return <>{children}</>;
}
