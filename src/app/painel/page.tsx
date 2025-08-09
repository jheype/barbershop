"use client";
import { useEffect, useState } from "react";
import type { Prisma } from "@prisma/client"; // 👈 importa tipos

// Tipo do booking já com relações incluídas:
type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    barber: true;
    services: { include: { service: true } };
  };
}>;

export default function PainelPage() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [filterDate, setFilterDate] = useState("");

  async function loadBookings(date?: string) {
    let url = "/api/admin/bookings";
    if (date) url += `?date=${date}`;
    const res = await fetch(url);
    const data = await res.json();
    setBookings(data);
  }

  useEffect(() => { loadBookings(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Painel de Agendamentos</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border p-2 text-black rounded"
        />
        <button onClick={() => loadBookings(filterDate)} className="bg-blue-500 text-white px-4 py-2 rounded">Filtrar</button>
        <button onClick={() => { setFilterDate(""); loadBookings(); }} className="bg-gray-500 text-white px-4 py-2 rounded">Limpar</button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-gray-600">Nenhum agendamento encontrado.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 p-2">Cliente</th>
              <th className="border border-gray-400 p-2">Serviços</th>
              <th className="border border-gray-400 p-2">Barbeiro</th>
              <th className="border border-gray-400 p-2">Data</th>
              <th className="border border-gray-400 p-2">Hora</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const d = new Date(b.date);
              const serviceNames = b.services.map(bs => bs.service?.name).filter(Boolean).join(", ");
              return (
                <tr key={b.id}>
                  <td className="border border-gray-400 p-2">{b.clientName}</td>
                  <td className="border border-gray-400 p-2">{serviceNames}</td>
                  <td className="border border-gray-400 p-2">{b.barber?.name ?? "-"}</td>
                  <td className="border border-gray-400 p-2">{d.toLocaleDateString("pt-BR")}</td>
                  <td className="border border-gray-400 p-2">
                    {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <button
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          location.href = "/admin/login";
        }}
        className="px-3 py-1 border rounded"
      >
        Sair
      </button>
    </div>
  );
}
