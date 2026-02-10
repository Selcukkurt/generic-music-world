import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleSectionClient from "../../ModuleSectionClient";

export default function ModuleSectionPage({
  params,
}: {
  params: { module: string; section: string };
}) {
  const activeModule = modules.find((item) => item.id === params.module);

  if (!activeModule) {
    notFound();
  }

  const section = activeModule.menuItems.find(
    (item) => item.href === `/${activeModule.id}/${params.section}`
  );

  if (!section) {
    notFound();
  }

  return (
    <ModuleSectionClient
      nameKey={activeModule.nameKey}
      sectionLabelKey={section.labelKey}
    />
  );
}
