"use client";

import { useEffect } from "react";

type IpStepGuardOpts = {
  /** Fikri mülkiyet adımı ilerlemede ve salt okunur değil */
  activeCompletable: boolean;
  modalOpen: boolean;
  alreadyAccepted: boolean;
};

/**
 * Development-only checks so agreement steps never ship without a completion path.
 * Does not run in production.
 */
export function useIpAgreementStepRegressionGuards(opts: IpStepGuardOpts): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!opts.activeCompletable) return;

    const id = requestAnimationFrame(() => {
      if (opts.modalOpen) {
        if (opts.alreadyAccepted) return;
        const save = document.querySelector("[data-onboarding-ip-save]");
        const box = document.getElementById("onboarding-ip-ack-modal") as HTMLInputElement | null;
        if (!save) {
          console.error(
            "[Onboarding regression] IP modal open (active accept) but «Onayı Kaydet» (data-onboarding-ip-save) missing."
          );
        }
        if (!box) {
          console.error(
            "[Onboarding regression] IP modal missing checkbox #onboarding-ip-ack-modal — no acknowledge path."
          );
        }
        return;
      }

      const openBtn = document.querySelector("[data-onboarding-ip-open]");
      if (!openBtn) {
        console.error(
          "[Onboarding regression] IP step active but no «Sözleşmeyi Aç» control (data-onboarding-ip-open) — dead-end."
        );
      }
    });

    return () => cancelAnimationFrame(id);
  }, [opts.activeCompletable, opts.modalOpen, opts.alreadyAccepted]);
}
