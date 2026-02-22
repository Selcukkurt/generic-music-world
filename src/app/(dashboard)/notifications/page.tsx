import type { Metadata } from "next";

import NotificationsClient from "./NotificationsClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.sidebar_notifications,
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
