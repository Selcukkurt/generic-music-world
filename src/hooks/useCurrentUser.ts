"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
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
        const { data: profile } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setUser(mapAuthUserToCurrentUser(session.user, profile?.role));
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
