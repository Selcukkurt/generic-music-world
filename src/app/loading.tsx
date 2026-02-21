import Image from "next/image";
import { tr } from "@/i18n/tr";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)]/90"
      style={{ zIndex: "var(--z-modal)" }}
    >
      <Image
        src="/brand-loader.gif"
        alt={tr.common_loading}
        width={80}
        height={80}
        className="h-20 w-20"
      />
    </div>
  );
}
