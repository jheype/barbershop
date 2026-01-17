"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SelectDate({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = use(params);
  const router = useRouter();

  const [date, setDate] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!date) {
        setAvailableTimes([]);
        return;
      }

      const qs = new URLSearchParams();
      qs.set("date", date);
      qs.set("serviceIds", serviceId);

      const res = await fetch(`/api/available-times?${qs.toString()}`, { cache: "no-store" });
      const data: unknown = await res.json().catch(() => []);
      if (!disposed) setAvailableTimes(Array.isArray(data) ? (data as string[]) : []);
    })();

    return () => {
      disposed = true;
    };
  }, [date, serviceId]);

  return (
    <div className="p-6">
      <h1 className="text-white text-xl font-semibold mb-4">Selecione a data</h1>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-[#2A2E36] bg-[#111318] text-white p-2"
      />

      {date && (
        <div className="mt-6">
          <h2 className="text-white font-semibold mb-2">Available times</h2>

          {availableTimes.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableTimes.map((time) => (
                <button
                  key={time}
                  className="rounded-md border border-[#2A2E36] bg-[#0F1115] text-white px-3 py-2 hover:bg-[#151923] transition"
                  onClick={() => {
                    const dateTime = `${date}T${time}`;
                    router.push(`/agendar/${serviceId}/${encodeURIComponent(dateTime)}`);
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-neutral-400">No available times for this day.</div>
          )}
        </div>
      )}
    </div>
  );
}
