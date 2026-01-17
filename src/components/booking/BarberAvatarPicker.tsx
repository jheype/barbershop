"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";

type Barber = { id: string; name: string; photo: string };

type Props = {
  value: string | null;
  onChangeAction: (barberId: string | null) => void;
  barbers: Barber[];
  loading?: boolean;
};

export default function BarberAvatarPicker({
  value,
  onChangeAction,
  barbers,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-3 py-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-12" rounded="full" />
        ))}
      </div>
    );
  }

  if (!barbers?.length) {
    return <div className="text-sm text-[#9AA0A6]">No barbeiro encontrado.</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <button
        type="button"
        title="Sem preferência"
        onClick={() => onChangeAction(null)}
        className={[
          "w-12 h-12 rounded-full border grid place-items-center",
          value === null
            ? "border-indigo-500 ring-2 ring-indigo-500/40"
            : "border-[#2A2E36]",
          "bg-[#0F1115] text-[#C9CDD3] hover:ring-2 hover:ring-indigo-500/30 transition",
        ].join(" ")}
      >
        –
      </button>

      {barbers.map((b) => {
        const selected = value === b.id;
        return (
          <button
            key={b.id}
            type="button"
            title={b.name}
            onClick={() => onChangeAction(b.id)}
            className={[
              "relative w-12 h-12 rounded-full border overflow-hidden",
              selected
                ? "border-indigo-500 ring-2 ring-indigo-500/40"
                : "border-[#2A2E36]",
              "hover:ring-2 hover:ring-indigo-500/30 transition",
            ].join(" ")}
          >
            <Image
              src={b.photo}
              alt={b.name}
              width={20}
              height={20}
              className="w-full h-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).src = "/avatar-placeholder.png")}
            />
            {selected && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center text-[10px] text-white">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
