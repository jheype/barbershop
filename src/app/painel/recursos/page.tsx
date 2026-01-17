"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Resource = {
  id: string;
  name: string;
  dailyCapacity: number;
  active: boolean;
};

export default function ResourcesAdminPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "1" | "0">("");
  const [form, setForm] = useState({
    id: "",
    name: "",
    dailyCapacity: "",
    active: true,
  });
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const select =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const card =
    "rounded-xl border border-[#24272D] bg-[#0F1115] p-4 hover:bg-[#12141A] transition";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (activeFilter) params.set("active", activeFilter);

      const data = await fetchAdminJSON<Resource[]>(
        `/api/admin/resources?${params.toString()}`
      );

      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, activeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function startCreate() {
    setForm({ id: "", name: "", dailyCapacity: "", active: true });
  }

  function startEdit(r: Resource) {
    setForm({
      id: r.id,
      name: r.name,
      dailyCapacity: String(r.dailyCapacity),
      active: r.active,
    });
  }

  async function save() {
    const payload = {
      name: form.name.trim(),
      dailyCapacity: Number(form.dailyCapacity),
      active: !!form.active,
    };

    if (!payload.name || Number.isNaN(payload.dailyCapacity) || payload.dailyCapacity < 0) {
      alert("Preencha nome e capacidade diária válida (>= 0).");
      return;
    }

    try {
      if (!form.id) {
        await fetchAdminJSON("/api/admin/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchAdminJSON(`/api/admin/resources/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      await load();
      startCreate();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao salvar recurso");
    }
  }

  async function toggleActive(r: Resource) {
    try {
      await fetchAdminJSON(`/api/admin/resources/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !r.active }),
      });
      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao atualizar status");
    }
  }

  async function remove(id: string) {
    try {
      await fetchAdminJSON(`/api/admin/resources/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao deletar recurso");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Resources exclusivos</h1>
          <p className="text-sm text-[#C9CDD3]">Controle itens limitados por dia, como Ozonoterapia.</p>
        </div>
        <div className="w-64">
          <input
            className={input}
            placeholder="Buscar por nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="w-40">
          <select
            className={select}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "" | "1" | "0")}
          >
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-5 shadow-inner">
        <h2 className="text-2xl font-bold mb-4">{form.id ? "Editar recurso" : "Novo recurso"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Nome</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Ozonoterapia"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Capacidade diária</label>
            <input
              type="number"
              className={input}
              value={form.dailyCapacity}
              onChange={(e) => setForm({ ...form, dailyCapacity: e.target.value })}
              placeholder="Ex.: 8"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="active" className="text-sm text-[#C9CDD3]">Active</label>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button onClick={save} className={`${btnPrimary} w-full sm:w-auto`}>
            {form.id ? "Save changes" : "Create resource"}
          </button>
          {form.id && (
            <button onClick={startCreate} className={`${btnGhost} w-full sm:w-auto`}>
              Cancel edição
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" rounded="lg" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16" rounded="lg" />
              </div>
              <Skeleton className="h-4 w-40" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-20" rounded="lg" />
                <Skeleton className="h-9 w-24" rounded="lg" />
              </div>
            </div>
          ))}

        {!loading && items.length === 0 && (
          <div className="col-span-full text-[#9AA0A6]">No recurso encontrado.</div>
        )}

        {!loading &&
          items.map((r) => (
            <div key={r.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{r.name}</div>
                  <div className="text-sm text-[#C9CDD3]">Capacidade diária: {r.dailyCapacity}</div>
                </div>
                <span
                  onClick={() => toggleActive(r)}
                  className={`inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium ${
                    r.active
                      ? "bg-[#113D2E] text-[#3DD68C] border border-[#1D493C]"
                      : "bg-[#2F3137] text-[#D0D4DA] border border-[#3A3F46]"
                  }`}
                  title="Click to toggle active"
                >
                  {r.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => startEdit(r)}>Editar</button>
                <button
                  className="px-3 py-2 rounded-md border border-rose-800/50 text-rose-300 hover:bg-rose-900/20 transition"
                  onClick={() => setConfirm({ open: true, id: r.id, name: r.name })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Excluir recurso?"
        description={
          confirm.name
            ? `Tem certeza que deseja excluir “${confirm.name}”? This action cannot be undone.`
            : "Tem certeza que deseja excluir?"
        }
        confirmText="Excluir"
        confirmTone="danger"
        onClose={() => setConfirm({ open: false })}
        onConfirm={() => {
          if (confirm.id) remove(confirm.id);
          setConfirm({ open: false });
        }}
      />
    </div>
  );
}
