import type { Metadata } from "next";

import EventDetailClient from "./EventDetailClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.m02_event_detail_title,
};

export default function EventDetailPage() {
  return <EventDetailClient />;
}
