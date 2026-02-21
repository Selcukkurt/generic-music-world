"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  mapAuthUserToCurrentUser,
  type CurrentUser,
} from "@/lib/auth/getCurrentUser";

export function useCurrentUser(): {
  user: CurrentUser | null;
  isLoading: boolean;
} {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const applySession = (session: { user: { id: string } } | null) => {
      if (session?.user) {
        setUser(mapAuthUserToCurrentUser(session.user));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isLoading };
}
