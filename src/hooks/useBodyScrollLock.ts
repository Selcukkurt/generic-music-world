"use client";

import { useEffect } from "react";

/**
 * Locks body scroll when overlays (sidebar, search, module panel) are open.
 * Prevents scroll chaining and touch scroll issues.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (locked) {
      document.body.classList.add("ui-scroll-lock");
    } else {
      document.body.classList.remove("ui-scroll-lock");
    }
    return () => {
      document.body.classList.remove("ui-scroll-lock");
    };
  }, [locked]);
}
