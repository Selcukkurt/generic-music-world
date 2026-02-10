import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleRootClient from "../ModuleRootClient";

export default function ModuleRootPage({
  params,
}: {
  params: { module: string };
}) {
  const module = modules.find((item) => item.id === params.module);

  if (!module) {
    notFound();
  }

  return <ModuleRootClient code={module.code} nameKey={module.nameKey} />;
}
