import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <CardSkeleton />
      <TableSkeleton />
    </div>
  );
}
