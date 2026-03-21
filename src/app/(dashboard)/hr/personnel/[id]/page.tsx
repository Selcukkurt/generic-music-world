import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import Personnel360Page from "./Personnel360Page";

export const metadata: Metadata = {
  title: "360° Personel Kartı - İK",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HrPersonnel360Page({ params }: Props) {
  const { id } = await params;
  return (
    <RequireAccess resource="personnel" action="view">
      <div className="p-6">
        <Personnel360Page key={id} personnelId={id} />
      </div>
    </RequireAccess>
  );
}
