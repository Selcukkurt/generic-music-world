import { notFound, redirect } from "next/navigation";

import LoginPage from "@/app/login/page";
import { modules } from "@/config/modules";
import ModuleRootClient from "../ModuleRootClient";

export default async function ModuleRootPage({
  params,
}: {
  params: Promise<{ module?: string }>;
}) {
  const { module: moduleId } = await params;
  if (!moduleId) notFound();

  // If the router matches this dynamic segment for /login, render the same page as app/login/page.tsx.
  if (moduleId === "login") {
    return <LoginPage />;
  }

  if (moduleId === "home") redirect("/home");

  const activeModule = (modules ?? []).find((item) => item.id === moduleId);
  if (!activeModule) notFound();

  return (
    <ModuleRootClient
      code={activeModule.code}
      nameKey={activeModule.nameKey}
    />
  );
}
