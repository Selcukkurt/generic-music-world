import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <div className="ui-card-plain p-6">
      <h1 className="text-xl font-semibold">Events</h1>
      <p className="ui-text-secondary mt-2 text-sm">
        Events overview will appear here.
      </p>
    </div>
  );
}
