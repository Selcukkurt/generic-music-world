import type { Metadata } from "next";

import ChatClient from "./ChatClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.shell_personal_item_6,
};

export default function ChatPage() {
  return <ChatClient />;
}
