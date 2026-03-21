import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleSectionClient from "../../../ModuleSectionClient";

export default async function ModuleSectionPage({
  params,
}: {
  params: Promise<{ module?: string; section?: string }>;
}) {
  const { module: moduleId, section: sectionId } = await params;
  if (!moduleId || !sectionId) notFound();

  const activeModule = (modules ?? []).find((item) => item.id === moduleId);
  if (!activeModule) notFound();

  const section = activeModule.menuItems.find(
    (item) => item.href === `${activeModule.basePath}/${sectionId}`
  );
  if (!section) notFound();

  return (
    <ModuleSectionClient
      nameKey={activeModule.nameKey}
      sectionLabelKey={section.labelKey}
    />
  );
}
