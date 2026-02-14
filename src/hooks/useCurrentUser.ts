"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/getCurrentUser";

export function useCurrentUser(): {
  user: CurrentUser | null;
  isLoading: boolean;
} {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { user, isLoading };
}
