import type { Metadata } from "next";

import TasksClient from "./TasksClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.page_events_title,
};

export default function EventsPage() {
  return <TasksClient />;
}
