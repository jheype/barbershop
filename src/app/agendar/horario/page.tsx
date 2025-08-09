"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Barber = { id: string; name: string; photo: string };

export default function EscolherHorarioPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const services = sp.get("services") || ""; // "id1,id2"
  const initialBarber = sp.get("barber") || "";
  const date = sp.get("date") || "";

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState(initialBarber);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // carrega barbeiros
  useEffect(() => {
    fetch("/api/barbers")
      .then(res => res.json())
      .then((data: Barber[]) => setBarbers(data));
  }, []);

  // recarrega horários ao mudar barber/data/services
  useEffect(() => {
    if (!services || !barberId || !date) return;
    setLoading(true);
    fetch(`/api/available-times?barber=${barberId}&services=${services}&date=${date}`)
      .then(res => res.json())
      .then((data) => setAvailableTimes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [services, barberId, date]);

  const selectedBarber = useMemo(
    () => barbers.find(b => b.id === barberId) || null,
    [barbers, barberId]
  );

  function handleTimeSelect(time: string) {
    router.push(
      `/agendar/confirmar?services=${services}&barber=${barberId}&date=${date}&time=${time}`
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold mb-4 text-center">Escolha um horário</h1>

      {/* Seletor de barbeiros (inline) */}
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Profissional</h2>
        <div className="flex gap-3 flex-wrap">
          {barbers.map(b => {
            const active = b.id === barberId;
            return (
              <button
                key={b.id}
                onClick={() => setBarberId(b.id)}
                className={`flex items-center gap-2 border rounded px-3 py-2 hover:shadow transition
                  ${active ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}
              >
                <img src={b.photo} alt={b.name} className="w-8 h-8 rounded-full object-cover" />
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo da data/barbeiro */}
      <div className="mb-4 text-sm text-gray-700">
        Data: <strong>{new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")}</strong>
        {selectedBarber && <> · Profissional: <strong>{selectedBarber.name}</strong></>}
      </div>

      {/* Horários */}
      {loading && <p className="text-center">Carregando horários...</p>}
      {!loading && availableTimes.length === 0 && (
        <p className="text-center text-red-500">Nenhum horário disponível para este dia.</p>
      )}
      {!loading && availableTimes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {availableTimes.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-800 transition"
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
