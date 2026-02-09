import type { Metadata } from "next";

import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Giriş",
  description: "Hesabınıza güvenli şekilde giriş yapın.",
};

export default function LoginPage() {
  return <LoginClient />;
}
