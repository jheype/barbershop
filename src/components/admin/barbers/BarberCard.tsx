"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

type Barber = {
  id: string;
  name: string;
  photo: string;
  active: boolean;
};

export default function BarberCard({
  barber,
  onDetails,
}: {
  barber: Barber;
  onDetails: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 hover:bg-[#12141A] transition">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
          {barber.photo ? (
            <Image src={barber.photo} alt={barber.name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="grid h-full w-full place-items-center text-lg font-semibold text-[#E4E7EC]">
              {barber.name.trim().slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-base font-semibold text-white">{barber.name}</p>
          <p className="mt-0.5 text-xs text-[#AEB4BE]">{barber.active ? "Active" : "Inactive"}</p>
        </div>

        <div className="mt-4 w-full">
          <Button className="w-full" onClick={onDetails}>
            View details
          </Button>
        </div>
      </div>
    </div>
  );
}