import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: "Ana Sayfa | " + tr.meta_default_title,
};

export default function HomePage() {
  return <HomePageClient />;
}
