import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="ui-card-plain p-6">
      <EmptyState
        title="No data yet"
        description="Data appears here when modules start collecting activity."
      />
    </div>
  );
}
