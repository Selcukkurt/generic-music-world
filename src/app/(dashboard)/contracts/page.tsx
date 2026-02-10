import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ticket Platforms",
};

export default function ContractsPage() {
  return (
    <div className="ui-card-plain p-6">
      <h1 className="text-xl font-semibold">Ticket Platforms</h1>
      <p className="ui-text-secondary mt-2 text-sm">
        Platform contracts will appear here.
      </p>
    </div>
  );
}
