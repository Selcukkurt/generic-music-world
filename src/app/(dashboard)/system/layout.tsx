"use client";

import RequireSystemOwner from "@/components/auth/RequireSystemOwner";

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireSystemOwner>{children}</RequireSystemOwner>;
}
