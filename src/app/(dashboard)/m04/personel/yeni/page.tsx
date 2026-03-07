import type { Metadata } from "next";
import RequireAccess from "@/components/auth/RequireAccess";
import AddPersonnelForm from "./AddPersonnelForm";

export const metadata: Metadata = {
  title: "Add New Personnel - M04",
};

export default function M04PersonelYeniPage() {
  return (
    <RequireAccess resource="personnel" action="manage">
      <div className="p-6">
        <AddPersonnelForm />
      </div>
    </RequireAccess>
  );
}
