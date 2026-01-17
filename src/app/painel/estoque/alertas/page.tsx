"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type LowItem = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  stockQty: number;
  lowStockThreshold: number;
  active: boolean;
};

export default function LowStockAlertsPage() {
  const [items, setItems] = useState<LowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFor, setMoveFor] = useState<LowItem | null>(null);
  const [moveQty, setMoveQty] = useState<string>("0");
  const [moveNote, setMoveNote] = useState("");

  const [thSaving, setThSaving] = useState<string>("");

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btn =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("active", onlyActive ? "1" : "0");

      const data = await fetchAdminJSON<LowItem[]>(
        `/api/admin/inventory/low-stock?${params.toString()}`
      );

      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, onlyActive]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function saveThreshold(p: LowItem, v: number) {
    setThSaving(p.id);
    try {
      await fetchAdminJSON(`/api/admin/products/${p.id}/threshold`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: v }),
      });

      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao salvar limite");
    } finally {
      setThSaving("");
    }
  }

  function openMove(p: LowItem) {
    setMoveFor(p);
    setMoveQty("0");
    setMoveNote("");
    setMoveOpen(true);
  }

  async function doMove() {
    if (!moveFor) return;

    const qty = Number(moveQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Informe uma quantidade válida (> 0).");
      return;
    }

    try {
      await fetchAdminJSON(`/api/admin/products/${moveFor.id}/moves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "IN", qty, note: moveNote || "Reposição" }),
      });

      setMoveOpen(false);
      await load();
    } catch (err) {
      const e = err as Error;
      alert(e.message || "Error ao registrar entrada");
    }
  }

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Alerts de estoque</h1>
          <p className="text-sm text-[#C9CDD3]">Products com saldo baixo, próximos do limite definido.</p>
        </div>
        <div className="w-64">
          <label className="block text-sm mb-1 text-[#C9CDD3]">Buscar</label>
          <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou SKU" />
        </div>
        <label className="text-sm text-[#C9CDD3] flex items-center gap-2">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          Somente ativos
        </label>
        <button className={btn} onClick={load}>Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28" rounded="lg" />
          </div>
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28" rounded="lg" />
          </div>
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28" rounded="lg" />
          </div>
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28" rounded="lg" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[#9AA0A6]">Sem alertas no momento.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-[#C9CDD3]">{p.sku || "—"} • {p.unit || "un"}</div>
                </div>
                <span className="text-xs rounded-md px-2 py-1 border border-rose-700/50 text-rose-300">
                  Baixo estoque
                </span>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-[#C9CDD3]">Saldo atual</div>
                <div className="text-lg font-bold text-white">{p.stockQty}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Limite alerta</label>
                  <input
                    type="number"
                    className={input}
                    defaultValue={p.lowStockThreshold || 0}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0) saveThreshold(p, v);
                    }}
                  />
                </div>
                <button
                  className={btn}
                  disabled={thSaving === p.id}
                  onClick={(e) => {
                    const wrap = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
                    const v = Number(wrap?.value || "0");
                    if (Number.isFinite(v) && v >= 0) saveThreshold(p, v);
                  }}
                >
                  {thSaving === p.id ? "Salvando..." : "Salvar limite"}
                </button>
              </div>

              <div className="mt-4">
                <button className={btnPrimary} onClick={() => openMove(p)}>Entrada rápida</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {moveOpen && moveFor && (
          <div className="fixed inset-0 z-[70] grid place-items-center p-4">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoveOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative z-[71] w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
            >
              <h3 className="text-lg font-bold text-white">Entrada para {moveFor.name}</h3>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Quantidade</label>
                  <input
                    type="number"
                    className={input}
                    value={moveQty}
                    onChange={(e) => setMoveQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Note</label>
                  <input
                    className={input}
                    value={moveNote}
                    onChange={(e) => setMoveNote(e.target.value)}
                    placeholder="Ex.: compra fornecedor X"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className={btn} onClick={() => setMoveOpen(false)}>Cancel</button>
                <button className={btnPrimary} onClick={doMove}>Registrar entrada</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
