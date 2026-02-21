import type { Metadata } from "next";

import GMDnaClient from "./GMDnaClient";

export const metadata: Metadata = {
  title: "Generic Music DNA",
  description: "Kurumsal Kimlik & Yönetişim",
};

export default function GMDnaPage() {
  return <GMDnaClient />;
}
