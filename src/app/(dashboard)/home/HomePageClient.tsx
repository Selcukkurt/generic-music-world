"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import WelcomeBox from "./WelcomeBox";
import SummaryCards from "./SummaryCards";
import ActionList from "./ActionList";
import KPISection from "./KPISection";
import ApprovalList from "./ApprovalList";
import NotificationList from "./NotificationList";
import KritikUyarilar from "./KritikUyarilar";
import BugunSection from "./BugunSection";
import SystemInfoSection from "./SystemInfoSection";
import SystemStatusCard from "./SystemStatusCard";

export default function HomePageClient() {
  const { user } = useCurrentUser();
  const roleLabel = user?.title ?? user?.role ?? "Kullanıcı";
  const isSuperAdmin = user?.role === "system_owner";

  return (
    <div className="flex w-full flex-col gap-6">
      <WelcomeBox
        userName={user?.fullName ?? "Kullanıcı"}
        roleLabel={roleLabel}
        pendingApprovals={3}
        unreadNotifications={2}
      />

      <SummaryCards
        pendingApprovals={3}
        unreadNotifications={2}
        openTasks={7}
        todayItems={5}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <ActionList />
          <KPISection />
        </div>

        <aside className="flex flex-col gap-6">
          <KritikUyarilar />
          <BugunSection />
          <ApprovalList maxItems={5} />
          <NotificationList maxItems={5} />
          {isSuperAdmin && <SystemStatusCard />}
        </aside>
      </div>

      {isSuperAdmin && <SystemInfoSection />}
    </div>
  );
}
