import type { Metadata } from "next";

import LoginClient from "./LoginClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: tr.meta_login_title,
  description: tr.meta_login_description,
};

export default function LoginPage() {
  return <LoginClient />;
}
