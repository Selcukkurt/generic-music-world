import type { Metadata } from "next";

import WorkflowTrackerClient from "./WorkflowTrackerClient";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: `${tr.m02_workflow_title} – ${tr.module_name_m02}`,
};

export default function M02WorkflowPage() {
  return <WorkflowTrackerClient />;
}
