"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";

type Barber = { id: string; name: string; photo: string };

export function HorarioClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const services = sp.get("services") || "";
  const initialBarber = sp.get("barber") || "";
  const date = sp.get("date") || "";

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState<string>(initialBarber);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const res = await fetch("/api/barbers", { cache: "no-store" });
      const data: unknown = await res.json().catch(() => []);
      if (!disposed) setBarbers(Array.isArray(data) ? (data as Barber[]) : []);
    })();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!services || !date) {
      setAvailableTimes([]);
      return;
    }

    let disposed = false;
    setLoading(true);

    (async () => {
      const params = new URLSearchParams();
      params.set("serviceIds", services);
      params.set("date", date);
      if (barberId) params.set("barberId", barberId);

      const res = await fetch(`/api/available-times?${params.toString()}`, { cache: "no-store" });
      const data: unknown = await res.json().catch(() => []);
      if (!disposed) {
        setAvailableTimes(Array.isArray(data) ? (data as string[]) : []);
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [services, barberId, date]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === barberId) || null,
    [barbers, barberId]
  );

  function handleTimeSelect(time: string) {
    router.push(
      `/agendar/confirmar?services=${encodeURIComponent(services)}&barber=${encodeURIComponent(
        barberId
      )}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="mb-6 flex items-center gap-3">
        {selectedBarber?.photo ? (
          <Image
            src={selectedBarber.photo}
            alt={selectedBarber.name}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neutral-800" />
        )}

        <div className="flex-1">
          <div className="text-white font-semibold">Available times</div>
          <div className="text-neutral-400 text-sm">{date}</div>
        </div>

        <select
          className="rounded-md border border-[#2A2E36] bg-[#111318] text-white p-2"
          value={barberId}
          onChange={(e) => setBarberId(e.target.value)}
        >
          <option value="">Qualquer barbeiro</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" rounded="lg" />
          ))}
        </div>
      ) : availableTimes.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availableTimes.map((t) => (
            <button
              key={t}
              className="rounded-md border border-[#2A2E36] bg-[#0F1115] text-white px-3 py-2 hover:bg-[#151923] transition"
              onClick={() => handleTimeSelect(t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-neutral-400">No available times for this day.</div>
      )}
    </div>
  );
}
