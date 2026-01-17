"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

type Props = {
  barber: {
    id: string;
    name: string;
    photo?: string | null;
    total: number;
    paid: number;
    pending: number;
    advances: number;
  };
  onOpen: () => void;
};

export default function BarberRemunerationCard({ barber, onOpen }: Props) {
  return (
    <div className="rounded-lg border border-[#2A2E36] bg-[#111318] p-4 flex gap-4 items-center">
      <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-[#1A1D24]">
        {barber.photo && (
          <Image src={barber.photo} alt={barber.name} fill className="object-cover" />
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-[#E4E7EC]">{barber.name}</p>

        <div className="mt-1 text-sm text-[#98A2B3] grid grid-cols-2 gap-x-4">
          <span>Total: £ {barber.total.toFixed(2)}</span>
          <span>Pago: £ {barber.paid.toFixed(2)}</span>
          <span>Pendente: £ {barber.pending.toFixed(2)}</span>
          <span>Vales: £ {barber.advances.toFixed(2)}</span>
        </div>
      </div>

      <Button variant="secondary" onClick={onOpen}>
        Ver
      </Button>
    </div>
  );
}