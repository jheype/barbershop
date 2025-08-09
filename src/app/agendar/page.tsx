"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
};

type ApiResponse = {
  items: Service[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function SelectServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const router = useRouter();

useEffect(() => {
  let ignore = false;
  const t = setTimeout(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q.length >= 2) params.set("q", q);         // só envia q com 2+ chars
      if (selectedCategory) params.set("category", selectedCategory);

      const url = `/api/services?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      console.log("GET /api/services ->", { url, data }); // debug

      const items: Service[] = Array.isArray(data) ? data : (data?.items ?? []);
      if (!ignore) {
        setServices(items);

        const cats = Array.from(
          new Set(items.map(s => s.category).filter(Boolean))
        ) as string[];
        setCategories(prev => Array.from(new Set([...(prev || []), ...cats])).sort());
      }
    } catch (err) {
      if (!ignore) console.error("Erro carregando serviços:", err);
    }
  }, 250);

  return () => { ignore = true; clearTimeout(t); };
}, [q, selectedCategory, page]);

  const selectedInfo = useMemo(() => {
    const map = new Map(services.map(s => [s.id, s]));
    let totalPrice = 0;
    let totalDuration = 0;
    selectedServices.forEach(id => {
      const s = map.get(id);
      if (s) {
        totalPrice += s.price;
        totalDuration += s.duration;
      }
    });
    return { totalPrice, totalDuration };
  }, [selectedServices, services]);

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function nextStep() {
    if (selectedServices.length === 0) {
      alert("Selecione pelo menos um serviço.");
      return;
    }
    const serviceParams = selectedServices.join(",");
    router.push(`/agendar/data?services=${serviceParams}`);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="p-6 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-4">Escolha seus serviços</h1>

        {/* Busca + categorias */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            placeholder="Buscar por nome ou descrição..."
            value={q}
            onChange={e => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="w-full md:w-1/2 p-2 border rounded text-black"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedCategory("");
                setPage(1);
              }}
              className={`px-3 py-1 rounded border ${selectedCategory === "" ? "bg-blue-600 text-white" : ""}`}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded border ${selectedCategory === cat ? "bg-blue-600 text-white" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {services.length === 0 && (
          <p className="mt-6 text-center text-gray-500">
            Nenhum serviço encontrado para sua busca.
          </p>
        )}

        {/* Grid de serviços */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {services.map(service => {
            const selected = selectedServices.includes(service.id);
            return (
              <div
                key={service.id}
                className={`border rounded-lg p-4 shadow cursor-pointer hover:shadow-md transition
                  ${selected ? "border-blue-600 ring-2 ring-blue-200" : "border-gray-300"}`}
                onClick={() => toggleService(service.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{service.name}</h2>
                    {service.category && (
                      <span className="text-xs text-gray-500">{service.category}</span>
                    )}
                  </div>
                  <strong>R$ {service.price.toFixed(2)}</strong>
                </div>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                )}
                <div className="mt-3 text-xs text-gray-600">
                  Duração: {service.duration} min
                </div>
                {selected && (
                  <div className="mt-3 inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    Selecionado
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paginação simples */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Próxima
          </button>
        </div>
      </div>

      {/* Barra fixa inferior com resumo */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t">
        <div className="max-w-6xl mx-auto w-full p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm">
            <div>
              <strong>{selectedServices.length}</strong> serviço(s) selecionado(s)
            </div>
            <div>
              Tempo total: <strong>{selectedInfo.totalDuration} min</strong> ·
              Valor total: <strong>R$ {selectedInfo.totalPrice.toFixed(2)}</strong>
            </div>
          </div>
          <button
            onClick={nextStep}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            disabled={selectedServices.length === 0}
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}
