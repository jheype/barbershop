"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function BarberGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="mt-3 h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-16" />
            <Skeleton className="mt-4 h-9 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}