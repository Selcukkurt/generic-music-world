"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
    const applySession = (session: Session | null) => {
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
