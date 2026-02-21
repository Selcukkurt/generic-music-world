import type { Metadata } from "next";

import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.shell_personal_item_6,
};

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{tr.shell_personal_item_6}</h1>
      <p className="ui-text-muted">Chat placeholder</p>
    </div>
  );
}
