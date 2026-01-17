"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";

type Barber = { id: string; name: string; photo: string };

type Props = {
  value?: string | null;
  onChangeAction: (id: string | null) => void;
  barbers: Barber[];
  loading?: boolean;
  variant?: "dark" | "light";
};

export default function BarberPicker({ value, onChangeAction, barbers, loading, variant = "dark" }: Props) {
  const isLight = variant === "light";
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              isLight ? "border-gray-300 bg-white" : "border-[#24272D] bg-[#0F1115]"
            }`}
          >
            <Skeleton className="h-10 w-10" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!barbers.length) return <div className={isLight ? "text-gray-600" : "text-[#9AA0A6]"}>No barbeiro disponível.</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {barbers.map((b) => {
        const selected = value === b.id;
        const card = selected
          ? isLight
            ? "border-indigo-500 bg-indigo-50"
            : "border-indigo-500 bg-[#1a1210]"
          : isLight
            ? "border-gray-300 bg-white hover:bg-gray-50"
            : "border-[#24272D] bg-[#0F1115] hover:bg-[#12141A]";
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onChangeAction(selected ? null : b.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition ${card}`}
          >
            <Image
              src={b.photo}
              alt={b.name}
              width={20}
              height={20}
              className={`w-10 h-10 rounded-full object-cover border ${isLight ? "border-gray-300" : "border-[#2A2E36]"} shrink-0`}
              onError={(e) => ((e.target as HTMLImageElement).src = "/avatar-placeholder.png")}
            />
            <div className="text-left">
              <div className={isLight ? "text-gray-900 font-medium truncate" : "text-white font-medium truncate"}>{b.name}</div>
              <div className={isLight ? "text-xs text-gray-600" : "text-xs text-[#C9CDD3]"}>Selecionar</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
