import { Suspense } from "react";
import { HorarioClient } from "./HorarioClient";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<HorarioPageSkeleton />}>
      <HorarioClient />
    </Suspense>
  );
}

function HorarioPageSkeleton() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-44" rounded="lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" rounded="lg" />
        ))}
      </div>
    </div>
  );
}
