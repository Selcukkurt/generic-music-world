import { notFound } from "next/navigation";

import { modules } from "@/config/modules";
import ModuleSectionClient from "../../ModuleSectionClient";

export default function ModuleSectionPage({
  params,
}: {
  params: { module: string; section: string };
}) {
  const module = modules.find((item) => item.id === params.module);

  if (!module) {
    notFound();
  }

  const section = module.menuItems.find(
    (item) => item.href === `/${module.id}/${params.section}`
  );

  if (!section) {
    notFound();
  }

  return (
    <ModuleSectionClient
      nameKey={module.nameKey}
      sectionLabelKey={section.labelKey}
    />
  );
}
