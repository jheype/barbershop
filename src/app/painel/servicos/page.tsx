"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ServiceProductsModal from "@/components/admin/ServiceProductsModal";
import ServiceResourcesModal from "@/components/admin/ServiceResourcesModal";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  active: boolean;
};

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "1" | "0">("");

  const [form, setForm] = useState({
    id: "",
    name: "",
    price: "",
    duration: "",
    category: "",
    description: "",
    active: true,
  });

  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [resModalOpen, setResModalOpen] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const [currentServiceName, setCurrentServiceName] = useState<string>("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const select =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      const data: Service[] = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      const c = s.category?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en-GB"));
  }, [services]);

  const filteredServices = useMemo(() => {
    const nq = norm(q);
    const cat = category.trim();
    const active = activeFilter;

    return services.filter((s) => {
      if (active === "1" && !s.active) return false;
      if (active === "0" && s.active) return false;

      if (cat && (s.category ?? "") !== cat) return false;

      if (!nq) return true;

      const hay = norm(
        [
          s.name ?? "",
          s.description ?? "",
          s.category ?? "",
        ].join(" ")
      );

      return hay.includes(nq);
    });
  }, [services, q, category, activeFilter]);

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

    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.duration)) {
      alert("Fill name, price and duration.");
      return;
    }

    try {
      if (!form.id) {
        await fetchAdminJSON("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchAdminJSON(`/api/admin/services/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      await load();
      startCreate();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao salvar serviço");
    }
  }

  async function toggleActive(s: Service) {
    try {
      await fetchAdminJSON(`/api/admin/services/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !s.active }),
      });
      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao atualizar status");
    }
  }

  async function remove(id: string) {
    try {
      await fetchAdminJSON(`/api/admin/services/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao deletar serviço");
    }
  }

  function handleDeleteClick(id: string, name: string) {
    setDeleteId(id);
    setDeleteName(name);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    await remove(deleteId);
    setConfirmOpen(false);
    setDeleteId(null);
    setDeleteName("");
  }

  function openProducts(service: Service) {
    setCurrentServiceId(service.id);
    setCurrentServiceName(service.name);
    setProdModalOpen(true);
  }

  function openResources(service: Service) {
    setCurrentServiceId(service.id);
    setCurrentServiceName(service.name);
    setResModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold">Services</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1 text-[#C9CDD3]">Search</label>
          <input
            className={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, description or category"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-[#C9CDD3]">Category</label>
          <select
            className={select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm mb-1 text-[#C9CDD3]">Active</label>
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

          <button onClick={load} className={`${btnGhost} h-10 self-end`}>
            Refresh
          </button>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-5 shadow-inner">
        <h2 className="text-2xl font-bold mb-4">
          {form.id ? "Edit Service" : "New Service"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Name</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Price (£)</label>
            <input
              type="number"
              step="0.01"
              className={input}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Duration (min)</label>
            <input
              type="number"
              className={input}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[#C9CDD3]">Category</label>
            <input
              className={input}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex.: Hair, Beard, Packages"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1 text-[#C9CDD3]">Description</label>
            <input
              className={input}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short text about the service"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="active" className="text-sm text-[#C9CDD3]">
              Active
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button onClick={save} className={`${btnPrimary} w-full sm:w-auto`}>
            {form.id ? "Save changes" : "Create service"}
          </button>
          {form.id && (
            <button onClick={startCreate} className={`${btnGhost} w-full sm:w-auto`}>
              Cancel editing
            </button>
          )}
        </div>
      </div>

      {/* Lista de serviços */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" rounded="lg" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16" rounded="lg" />
              </div>
              <Skeleton className="h-4 w-40" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-20" rounded="lg" />
                <Skeleton className="h-9 w-36" rounded="lg" />
                <Skeleton className="h-9 w-36" rounded="lg" />
              </div>
            </div>
          ))}

        {!loading && filteredServices.length === 0 && (
          <div className="col-span-full text-[#9AA0A6]">
            No service found.
          </div>
        )}

        {!loading &&
          filteredServices.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="text-sm text-[#C9CDD3]">{s.category || "-"}</div>
                </div>

                <span
                  onClick={() => toggleActive(s)}
                  className={`inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium ${
                    s.active
                      ? "bg-[#113D2E] text-[#3DD68C] border border-[#1D493C]"
                      : "bg-[#2F3137] text-[#D0D4DA] border border-[#3A3F46]"
                  }`}
                  title="Click to toggle active"
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="text-sm text-[#C9CDD3]">
                £ {s.price.toFixed(2)} • {s.duration} min
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEdit(s)} className={btnGhost}>
                  Edite
                </button>
                <button onClick={() => openProducts(s)} className={btnGhost}>
                  Service Products
                </button>
                <button onClick={() => openResources(s)} className={btnGhost}>
                  Resources
                </button>
                <button
                  onClick={() => handleDeleteClick(s.id, s.name)}
                  className="px-3 py-2 rounded-md border border-[#2A2E36] text-fuchsia-400 hover:bg-[#1A1C1F]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      <ServiceProductsModal
        open={prodModalOpen}
        serviceId={currentServiceId}
        serviceName={currentServiceName}
        onClose={() => setProdModalOpen(false)}
        onSaved={() => {
          setProdModalOpen(false);
          load();
        }}
      />

      <ServiceResourcesModal
        open={resModalOpen}
        serviceId={currentServiceId}
        serviceName={currentServiceName}
        onClose={() => setResModalOpen(false)}
        onSaved={() => {
          setResModalOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir serviço"
        description={`Tem certeza que deseja excluir o serviço "${deleteName}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancel"
        confirmTone="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
