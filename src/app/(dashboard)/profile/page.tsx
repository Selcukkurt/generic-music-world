import type { Metadata } from "next";

import ProfileIdentity from "./ProfileIdentity";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.profile_menu_profile,
};

export default function ProfilePage() {
  return <ProfileIdentity />;
}
