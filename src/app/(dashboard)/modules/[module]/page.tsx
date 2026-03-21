import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleRootClient from "../../ModuleRootClient";

export default async function ModuleRootPage({
  params,
}: {
  params: Promise<{ module?: string }>;
}) {
  const { module: moduleId } = await params;
  if (!moduleId) notFound();

  const activeModule = (modules ?? []).find((item) => item.id === moduleId);
  if (!activeModule) notFound();

  return (
    <ModuleRootClient
      code={activeModule.code}
      nameKey={activeModule.nameKey}
    />
  );
}
