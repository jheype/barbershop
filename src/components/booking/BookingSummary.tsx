"use client";

import { useEffect, useMemo, useState } from "react";

type Service = { id: string; name: string; price: number; duration: number };
type Barber = { id: string; name: string; photo: string };

export function BookingSummary(props: {
  serviceIds: string[];
  barberId?: string | null;
  dateISO?: string | null;
}) {
  const { serviceIds, barberId, dateISO } = props;

  const [services, setServices] = useState<Service[]>([]);
  const [barber, setBarber] = useState<Barber | null>(null);

  const serviceIdsKey = useMemo(() => serviceIds.slice().sort().join(","), [serviceIds]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!serviceIds.length) {
        if (alive) setServices([]);
        return;
      }

      const params = new URLSearchParams();
      params.set("ids", serviceIds.join(","));

      const res = await fetch(`/api/services/bulk?${params.toString()}`);
      const data: unknown = await res.json().catch(() => null);

      const list = Array.isArray(data) ? (data as Service[]) : [];
      if (alive) setServices(list);
    }

    run().catch(() => {});
    return () => {
      alive = false;
    };
  }, [serviceIdsKey, serviceIds]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!barberId) {
        if (alive) setBarber(null);
        return;
      }
      const res = await fetch(`/api/barbers/${barberId}`);
      const data: unknown = await res.json().catch(() => null);
      if (alive) setBarber(data && typeof data === "object" ? (data as Barber) : null);
    }

    run().catch(() => {});
    return () => {
      alive = false;
    };
  }, [barberId]);

  const totalPrice = services.reduce((acc, s) => acc + (s.price || 0), 0);
  const totalDuration = services.reduce((acc, s) => acc + (s.duration || 0), 0);

  const when = dateISO
    ? new Date(dateISO).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
    : "—";

  return (
    <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Resumo</div>
        <div className="text-xs text-[#9AA0A6]">{services.length} serviço(s)</div>
      </div>

      <div className="mt-3 space-y-2">
        {services.length === 0 ? (
          <div className="text-sm text-[#9AA0A6]">Selecione serviços.</div>
        ) : (
          <div className="space-y-1">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{s.name}</span>
                <span className="text-[#C9CDD3]">
                  £ {Number(s.price || 0).toFixed(2)} • {s.duration || 0}m
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-[#2A2E36] pt-2 text-sm">
          <span className="text-white">Total</span>
          <span className="text-white">
            £ {Number(totalPrice).toFixed(2)} • {totalDuration}m
          </span>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-xs text-[#9AA0A6]">Barber</div>
          <div className="text-sm text-white">{barber ? barber.name : "Automático"}</div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-xs text-[#9AA0A6]">Date/Time</div>
          <div className="text-sm text-white">{when}</div>
        </div>
      </div>
    </div>
  );
}