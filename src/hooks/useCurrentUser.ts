"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchAppUserForAuth } from "@/lib/auth/fetchAppUserForAuth";
import {
  mapAuthUserToCurrentUser,
  type CurrentUser,
} from "@/lib/auth/mapAuthUser";

export function useCurrentUser(): {
  user: CurrentUser | null;
  isLoading: boolean;
} {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const applySession = async (session: Session | null) => {
      if (session?.user) {
        const appUser = await fetchAppUserForAuth(supabaseBrowser, session.user.id);
        setUser(mapAuthUserToCurrentUser(session.user, appUser ?? undefined));
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
