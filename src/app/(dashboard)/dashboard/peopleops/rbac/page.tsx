"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PeopleOpsRbacPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system/rbac");
  }, [router]);
  return (
    <div className="flex w-full items-center justify-center p-12">
      <p className="ui-text-muted">Yönlendiriliyor...</p>
    </div>
  );
}
