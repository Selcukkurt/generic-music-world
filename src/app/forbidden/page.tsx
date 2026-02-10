import type { Metadata } from "next";

import { ErrorState } from "@/components/ui/ErrorState";

export const metadata: Metadata = {
  title: "Erişim Yok",
};

export default function ForbiddenPage() {
  return (
    <div className="ui-page flex min-h-[100dvh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="403 – Erişim Yok"
          message="Bu sayfayı görüntüleme yetkiniz bulunmuyor."
          helper="Erişim ihtiyaçlarınız için yöneticinizle iletişime geçin."
        />
      </div>
    </div>
  );
}
