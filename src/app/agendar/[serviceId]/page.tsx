"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectDate({ params }: { params: Promise<{ serviceId: string }> }) {
    const { serviceId } = use(params);
    const [date, setDate] = useState("");
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const router = useRouter();

useEffect(() => {
  if (date) {
    fetch(`/api/available-times?date=${date}&serviceId=${serviceId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableTimes(data);
        } else {
          console.error("API não retornou array:", data);
          setAvailableTimes([]);
        }
      });
  }
}, [date, serviceId]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Escolha a data</h1>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2"
            />

            {date && (
                <div className="mt-4">
                    <h2 className="text-xl mb-2">Horarios Disponiveis</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {availableTimes.map(time => (
                            <button
                                key={time}
                                className="border p-2 rounded hover:bg-blue-500"
                                onClick={() => {
                                    const dateTime = `${date}T${time}`;
                                    router.push(`/agendar/${serviceId}/${encodeURIComponent(dateTime)}`);
                                }}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}