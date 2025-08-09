"use client";

import { useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  active: boolean;
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "1" | "0">("");

  // form state (create/edit)
  const [form, setForm] = useState({
    id: "",
    name: "",
    price: "",
    duration: "",
    category: "",
    description: "",
    active: true,
  });

  const categories = useMemo(
    () =>
      Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[],
    [services]
  );

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (activeFilter) params.set("active", activeFilter);

      const res = await fetch(`/api/admin/services?${params.toString()}`);
      const data: Service[] = await res.json();
      setServices(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, activeFilter]);

  function startCreate() {
    setForm({
      id: "",
      name: "",
      price: "",
      duration: "",
      category: "",
      description: "",
      active: true,
    });
  }

  function startEdit(s: Service) {
    setForm({
      id: s.id,
      name: s.name,
      price: String(s.price),
      duration: String(s.duration),
      category: s.category || "",
      description: s.description || "",
      active: s.active,
    });
  }

  async function save() {
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      active: !!form.active,
    };

    if (!payload.name || isNaN(payload.price) || isNaN(payload.duration)) {
      alert("Preencha nome, preço e duração corretamente.");
      return;
    }

    if (!form.id) {
      // create
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e?.error || "Erro ao criar serviço");
        return;
      }
    } else {
      // update
      const res = await fetch(`/api/admin/services/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e?.error || "Erro ao atualizar serviço");
        return;
      }
    }

    await load();
    startCreate(); // limpa form
  }

  async function toggleActive(s: Service) {
    const res = await fetch(`/api/admin/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e?.error || "Erro ao atualizar status");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Tem certeza que deseja deletar este serviço?")) return;
    const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e?.error || "Erro ao deletar serviço");
      return;
    }
    await load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Serviços</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 border-2 rounded-md border-orange-700 shadow-orange-500/20 hover:bg-gradient-to-r hover:from-orange-700 hover:to-red-500 hover:scale-105 transition-all duration-300"
        >
          Novo Serviço
        </button>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Busca</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou descrição"
            className="border rounded p-2 text-black"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded p-2 text-black"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Ativo</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="border rounded p-2 text-black"
          >
            <option value="">Todos</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 border-2 rounded-md border-orange-700 shadow-orange-500/20 hover:bg-gradient-to-r hover:from-orange-700 hover:to-red-500 hover:scale-105 transition-all duration-300"
        >
          Atualizar
        </button>
      </div>

      {/* Form */}
      <div className="mt-6 border rounded p-4">
        <h2 className="text-xl font-semibold mb-3">
          {form.id ? "Editar Serviço" : "Novo Serviço"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Nome</label>
            <input
              className="w-full border rounded p-2 text-black"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded p-2 text-black"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Duração (min)</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-black"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Categoria</label>
            <input
              className="w-full border rounded p-2 text-black"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex.: Cabelo, Barba, Pacotes"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Descrição</label>
            <input
              className="w-full border rounded p-2 text-black"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Texto curto sobre o serviço"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="active">Ativo</label>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={save} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded">
            {form.id ? "Salvar alterações" : "Cadastrar serviço"}
          </button>
          {form.id && (
            <button
              onClick={startCreate}
              className="px-4 py-2 border rounded"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-zinc-800">
              <th className="p-2 text-left">Nome</th>
              <th className="p-2 text-right">Preço</th>
              <th className="p-2 text-right">Duração</th>
              <th className="p-2">Categoria</th>
              <th className="p-2">Ativo</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td className="p-2">{s.name}</td>
                <td className="p-2 text-right">R$ {s.price.toFixed(2)}</td>
                <td className="p-2 text-right">{s.duration} min</td>
                <td className="p-2">{s.category || "-"}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`px-2 py-1 rounded text-white ${s.active ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gray-500"}`}
                    title="Alternar ativo"
                  >
                    {s.active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(s)}
                      className="px-3 py-1 border border-green-600 text-green-600 rounded hover:bg-green-600 hover:text-white transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="px-3 py-1 border border-red-600 rounded text-red-600 hover:bg-red-600 transition hover:text-white"
                    >
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {services.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Nenhum serviço encontrado.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
