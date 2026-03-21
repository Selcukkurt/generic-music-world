"use client";

import { useEffect, useState } from "react";
import { fetchMyPermissions } from "@/lib/rbac-v1/api";
import { hasPermission as checkPermission } from "@/lib/rbac-v1/hasPermission";

const DISABLE_RBAC =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DISABLE_RBAC === "true";

export function usePermissions(): {
  permissions: string[];
  isLoading: boolean;
  hasPermission: (key: string) => boolean;
} {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyPermissions()
      .then(setPermissions)
      .catch(() => setPermissions([]))
      .finally(() => setIsLoading(false));
  }, []);

  const hasPermission = (key: string) =>
    DISABLE_RBAC ? true : checkPermission(permissions, key);

  return { permissions, isLoading, hasPermission };
}
