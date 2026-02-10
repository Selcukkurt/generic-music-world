type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/60 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="ui-card-plain p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-3 w-5/6" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="ui-card-plain p-4">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-10/12" />
      </div>
    </div>
  );
}
