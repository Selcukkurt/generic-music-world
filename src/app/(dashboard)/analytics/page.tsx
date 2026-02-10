import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <div className="ui-card-plain p-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <p className="ui-text-secondary mt-2 text-sm">
        Analytics modules will appear here.
      </p>
    </div>
  );
}
