"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Barber = {
  id: string;
  name: string;
  photo: string;
};

export default function SelectDateBarberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const serviceIds = searchParams.get("services");

  useEffect(() => {
    fetch("/api/barbers")
      .then(res => res.json())
      .then(data => {
        console.log("Barbeiros carregados:", data);
        setBarbers(data);
      });
  }, []);

  const handleNext = () => {
    if (!date || !selectedBarber || !serviceIds) {
      alert("Selecione uma data e um barbeiro.");
      return;
    }

    const encodedDate = encodeURIComponent(date);
    router.push(`/agendar/horario?services=${serviceIds}&date=${encodedDate}&barber=${selectedBarber}`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Escolha a Data e o Barbeiro</h1>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Selecione a data:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border p-2 rounded w-full text-black"
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Escolha o barbeiro:</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {barbers.length > 0 ? (
            barbers.map(barber => (
              <div
                key={barber.id}
                className={`border rounded-lg p-4 cursor-pointer shadow flex flex-col items-center ${
                  selectedBarber === barber.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
                onClick={() => setSelectedBarber(barber.id)}
              >
                <img
                  src={barber.photo}
                  alt={barber.name}
                  className="w-20 h-20 rounded-full object-cover mb-2"
                />
                <span className="font-medium">{barber.name}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nenhum barbeiro encontrado.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Avançar
        </button>
      </div>
    </div>
  );
}
