"use client";

import { usePathname } from "next/navigation";
import RequireSystemOwner from "@/components/auth/RequireSystemOwner";

/** Bypass RBAC protection for /system/rbac during recovery. */
const RBAC_BYPASS =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DISABLE_RBAC === "true";

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRbacPage = pathname === "/system/rbac" || pathname?.startsWith("/system/rbac/");
  const skipGuard = RBAC_BYPASS && isRbacPage;

  if (skipGuard) {
    return <>{children}</>;
  }

  return <RequireSystemOwner>{children}</RequireSystemOwner>;
}
