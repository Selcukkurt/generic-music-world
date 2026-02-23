import type { Metadata } from "next";

import EventListClient from "./EventListClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m02_events_title,
};

export default function M02EventsPage() {
  return <EventListClient />;
}
