"use client";
import { useEffect, useState } from "react";

type Booking = {
    id: string;
    clientName: string;
    date: string;
    service: { name: string };
};

export default function PainelPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filterDate, setFilterDate] = useState("");

    async function loadBookings(date?: string) {
        let url = "/api/admin/bookings";
        if (date) url += `?date=${date}`;

        const res = await fetch(url);
        const data = await res.json();
        setBookings(data);
    }

    useEffect(() => {
        loadBookings();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Painel de Agendamentos</h1>

            <div className="mb-4 flex items-center gap-2">
                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border p-2"
                />
                <button
                    onClick={() => loadBookings(filterDate)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Filtrar
                </button>
                <button
                    onClick={() => {
                        setFilterDate("");
                        loadBookings();
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                    Limpar
                </button>
            </div>

           {bookings.length > 0 ? (
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 p-2">Cliente</th>
              <th className="border border-gray-400 p-2">Serviço</th>
              <th className="border border-gray-400 p-2">Data</th>
              <th className="border border-gray-400 p-2">Hora</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const dateObj = new Date(b.date);
              return (
                <tr key={b.id}>
                  <td className="border border-gray-400 p-2">{b.clientName}</td>
                  <td className="border border-gray-400 p-2">{b.service?.name}</td>
                  <td className="border border-gray-400 p-2">
                    {dateObj.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {dateObj.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">Nenhum agendamento encontrado.</p>
      )}
    </div>
  );
}