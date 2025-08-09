"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Service = { id: string; name: string; price: number; duration: number };
type Barber = { id: string; name: string; photo: string };

export default function ConfirmarAgendamentoPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const serviceIds = sp.get("services") || ""; // "id1,id2,id3"
  const barberId = sp.get("barber") || "";
  const date = sp.get("date") || ""; // "YYYY-MM-DD"
  const time = sp.get("time") || ""; // "HH:mm"

  const [services, setServices] = useState<Service[]>([]);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [clientName, setClientName] = useState("");

  const totalPrice = services.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = services.reduce((acc, s) => acc + s.duration, 0); // minutos

  useEffect(() => {
    async function load() {
      if (!serviceIds || !barberId || !date || !time) return;

      // Busca serviços selecionados
      const servicesRes = await fetch(`/api/services/bulk?ids=${encodeURIComponent(serviceIds)}`);
      const servicesData = await servicesRes.json();
      setServices(Array.isArray(servicesData) ? servicesData : []);

      // Busca barbeiro
      const barberRes = await fetch(`/api/barbers/${barberId}`);
      const barberData = await barberRes.json();
      setBarber(barberData ?? null);
    }
    load();
  }, [serviceIds, barberId, date, time]);

  async function handleConfirm() {
    if (!clientName) {
      alert("Informe seu nome.");
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          barberId,
          serviceIds: serviceIds.split(","),
          date, // "YYYY-MM-DD"
          time, // "HH:mm"
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Erro ao salvar o agendamento");
      }

      router.push("/sucesso");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar o agendamento");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Confirmar Agendamento</h1>

      <div className="space-y-4 mb-8">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Serviços selecionados</h2>
          {services.length === 0 ? (
            <p className="text-gray-600">Carregando serviços...</p>
          ) : (
            <ul className="list-disc ml-5">
              {services.map(s => (
                <li key={s.id}>
                  {s.name} — R$ {s.price.toFixed(2)} ({s.duration} min)
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-sm text-gray-700">
            <div>Total de tempo: <strong>{totalDuration} min</strong></div>
            <div>Total a pagar: <strong>R$ {totalPrice.toFixed(2)}</strong></div>
          </div>
        </div>

        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Profissional</h2>
          {!barber ? (
            <p className="text-gray-600">Carregando barbeiro...</p>
          ) : (
            <div className="flex items-center gap-3">
              <img src={barber.photo} alt={barber.name} className="w-14 h-14 rounded-full object-cover" />
              <span className="font-medium">{barber.name}</span>
            </div>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Data e horário</h2>
          <p>
            Data: <strong>{new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")}</strong><br />
            Horário: <strong>{time}</strong>
          </p>
        </div>

        <div className="border rounded p-4">
          <label className="block text-sm font-medium mb-1">Seu nome</label>
          <input
            className="w-full p-2 border rounded text-black"
            placeholder="Ex: João Silva"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={() => history.back()}
          className="px-4 py-2 rounded border"
        >
          Voltar
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
