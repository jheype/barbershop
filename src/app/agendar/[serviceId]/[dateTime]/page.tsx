"use client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmBooking({ params }: { params: Promise<{ serviceId: string, dateTime: string }> }) {
  const { serviceId, dateTime } = use(params);
  const [name, setName] = useState("");
  const router = useRouter();

  async function handleConfirm() {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        clientName: name,
        date: dateTime, 
      }),
    });

    if (res.ok) {
      router.push("/sucesso");
    } else {
      alert("Erro ao salvar agendamento");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Confirme seu agendamento</h1>
      <input
        type="text"
        placeholder="Seu nome"
        className="border p-2 mb-4 block"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        onClick={handleConfirm}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Confirmar
      </button>
    </div>
  );
}
