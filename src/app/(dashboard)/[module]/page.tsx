import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleRootClient from "../ModuleRootClient";

export default function ModuleRootPage({
  params,
}: {
  params: { module: string };
}) {
  const activeModule = modules.find((item) => item.id === params.module);

  if (!activeModule) {
    notFound();
  }

  return (
    <ModuleRootClient
      code={activeModule.code}
      nameKey={activeModule.nameKey}
    />
  );
}
