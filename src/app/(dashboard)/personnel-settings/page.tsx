import { redirect } from "next/navigation";

/** Redirect legacy /personnel-settings to /settings?tab=personnel */
export default function PersonnelSettingsPage() {
  redirect("/settings?tab=personnel");
}
