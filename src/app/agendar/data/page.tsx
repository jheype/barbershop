"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";

type Barber = {
  id: string;
  name: string;
  photo: string;
};

export default function SelectDateBarberPage() {
  return (
    <Suspense fallback={<SelectDateBarberSkeleton />}>
      <SelectDateBarberInner />
    </Suspense>
  );
}

function SelectDateBarberSkeleton() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="space-y-3 mb-6">
        <Skeleton className="h-9 w-80 mx-auto" rounded="lg" />
        <Skeleton className="h-5 w-52 mx-auto" />
      </div>

      <div className="mb-6 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-full" rounded="lg" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 shadow flex flex-col items-center space-y-3">
              <Skeleton className="h-16 w-16" rounded="full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="mt-8 h-12 w-full" rounded="lg" />
    </div>
  );
}

function SelectDateBarberInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const serviceIds = searchParams.get("services") || "";

  useEffect(() => {
    fetch("/api/barbers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Barber[]) => setBarbers(Array.isArray(data) ? data : []))
      .catch(() => setBarbers([]));
  }, []);

  const handleNext = () => {
    if (!date || !selectedBarber || !serviceIds) {
      alert("Selecione uma data e um barbeiro.");
      return;
    }

    const encodedDate = encodeURIComponent(date);
    router.push(
      `/agendar/horario?services=${serviceIds}&date=${encodedDate}&barber=${selectedBarber}`
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Pick a date & barber
      </h1>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Selecione a data:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded w-full text-black"
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Choose a barber:</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {barbers.length > 0 ? (
            barbers.map((barber) => (
              <div
                key={barber.id}
                className={`border rounded-lg p-4 cursor-pointer shadow flex flex-col items-center ${
                  selectedBarber === barber.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
                onClick={() => setSelectedBarber(barber.id)}
              >
                <Image
                  src={barber.photo}
                  alt={barber.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover mb-2"
                />
                <span className="font-medium">{barber.name}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No barbeiro encontrado.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
