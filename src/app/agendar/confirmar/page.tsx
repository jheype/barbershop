"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getErrorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/Skeleton";

type Service = { id: string; name: string; price: number; duration: number };
type Barber = { id: string; name: string; photo: string };

export default function ConfirmarAgendamentoPage() {
  return (
    <Suspense fallback={<ConfirmarSkeleton />}>
      <ConfirmarAgendamentoInner />
    </Suspense>
  );
}

function ConfirmarSkeleton() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="space-y-3 mb-6">
        <Skeleton className="h-9 w-64 mx-auto" rounded="lg" />
        <Skeleton className="h-5 w-40 mx-auto" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded p-4 space-y-3">
            <Skeleton className="h-6 w-44" rounded="lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmarAgendamentoInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const serviceIds = sp.get("services") || "";
  const barberId = sp.get("barber") || "";
  const date = sp.get("date") || "";
  const time = sp.get("time") || "";

  const [services, setServices] = useState<Service[]>([]);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [waOptIn, setWaOptIn] = useState(true);


  const totalPrice = useMemo(
    () => services.reduce((acc, s) => acc + s.price, 0),
    [services]
  );
  const totalDuration = useMemo(
    () => services.reduce((acc, s) => acc + s.duration, 0),
    [services]
  );

  useEffect(() => {
    let aborted = false;

    async function load() {
      if (!serviceIds || !barberId || !date || !time) return;

      const servicesRes = await fetch(
        `/api/services/bulk?ids=${encodeURIComponent(serviceIds)}`,
        { cache: "no-store" }
      );
      const servicesData = await servicesRes.json().catch(() => []);
      if (!aborted) setServices(Array.isArray(servicesData) ? servicesData : []);

      const barberRes = await fetch(`/api/barbers/${barberId}`, {
        cache: "no-store",
      });
      const barberData = await barberRes.json().catch(() => null);
      if (!aborted) setBarber(barberData ?? null);
    }
    load();

    return () => {
      aborted = true;
    };
  }, [serviceIds, barberId, date, time]);

  async function handleConfirm() {
    if (!clientName.trim()) {
      alert("Informe seu nome.");
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          waOptIn,
          barberId,
          serviceIds: serviceIds.split(","),
          date,
          time,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Error ao salvar o agendamento");
      }

      router.push("/sucesso");
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Error ao salvar o agendamento"));
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Confirmar Agendamento</h1>

      <div className="space-y-4 mb-8">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Services selecionados</h2>
          {services.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" rounded="full" />
                  <Skeleton className="h-4 w-56" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-disc ml-5">
              {services.map((s) => (
                <li key={s.id}>
                  {s.name} — £ {s.price.toFixed(2)} ({s.duration} min)
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            <div>
              Total de tempo: <strong>{totalDuration} min</strong>
            </div>
            <div>
              Total due: <strong>£ {totalPrice.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Profissional</h2>
          {!barber ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14" rounded="full" />
              <Skeleton className="h-5 w-40" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Image
                src={barber.photo}
                alt={barber.name}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover"
              />
              <span className="font-medium">{barber.name}</span>
            </div>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Date & time</h2>
          <p>
            Data:{" "}
            <strong>
              {date
                ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB")
                : "-"}
            </strong>
            <br />
            Time: <strong>{time || "-"}</strong>
          </p>
        </div>

        <div className="border rounded p-4">
          <label className="block text-sm font-medium mb-1">Seu nome</label>
          <input
            className="w-full p-2 border rounded text-black mb-3"
            placeholder="e.g. Alex Smith"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <label className="block text-sm font-medium mb-1">Seu telefone (WhatsApp)</label>
          <input
            className="w-full p-2 border rounded text-black"
            placeholder="(+00 000 000 0000"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            inputMode="tel"
          />

          <label className="mt-2 flex items-start gap-2 text-sm select-none">
            <input
              type="checkbox"
              checked={waOptIn}
              onChange={(e) => setWaOptIn(e.target.checked)}
              className="mt-1"
            />
            <span>I want to receive my booking confirmation on WhatsApp.</span>
          </label>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => router.back()} className="px-4 py-2 rounded border">
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
