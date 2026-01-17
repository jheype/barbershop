"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { centsToBRL } from "@/lib/money";
import { Skeleton } from "@/components/ui/Skeleton";

type ProductLite = {
  id: string;
  name: string;
  stockQty: number;
  priceCents?: number | null;
  active: boolean;
};

type ClientLite = { id: string; name: string; phoneRaw: string | null };

type Line = { productId: string; qty: string };

type Props = {
  open: boolean;
  title: string;
  bookingId?: string | null;
  showClientPicker?: boolean;
  initialClientId?: string | null;
  mode?: "sale" | "pick" | "booking";
  onCloseAction: () => void;
  onSavedAction: (payload: { saleId: string; items: Array<{ productId: string; qty: number }> }) => void;
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
const btnGhost =
  "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition disabled:opacity-50";

export default function SaleItemsModal({
  open,
  title,
  bookingId,
  showClientPicker,
  initialClientId,
  mode,
  onCloseAction,
  onSavedAction,
}: Props) {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ productId: "", qty: "1" }]);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState<string | null>(initialClientId ?? null);
  const [clientQ, setClientQ] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientLite[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLines([{ productId: "", qty: "1" }]);
    setSaving(false);
    setClientId(initialClientId ?? null);
    setClientQ("");
    setClientOptions([]);
  }, [open, initialClientId]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setProductsLoading(true);
    fetchAdminJSON(`/api/admin/products?active=1`)
      .then((r) => {
        if (!alive) return;
        setProducts(Array.isArray(r) ? (r as ProductLite[]) : []);
      })
      .catch(() => {
        if (!alive) return;
        setProducts([]);
      })
      .finally(() => {
        if (!alive) return;
        setProductsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!showClientPicker) return;
    const q = clientQ.trim();
    if (q.length < 2) {
      setClientOptions([]);
      return;
    }
    let alive = true;
    setClientsLoading(true);
    fetchAdminJSON(`/api/admin/clients?q=${encodeURIComponent(q)}&page=1&pageSize=10`)
      .then((r) => {
        if (!alive) return;
        const items = (r as { items?: ClientLite[] })?.items || [];
        setClientOptions(items);
      })
      .catch(() => {
        if (!alive) return;
        setClientOptions([]);
      })
      .finally(() => {
        if (!alive) return;
        setClientsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, showClientPicker, clientQ]);

  const itemsPayload = useMemo(() => {
    const out: Array<{ productId: string; qty: number }> = [];
    for (const l of lines) {
      const pid = l.productId;
      const qty = Number(l.qty || 0);
      if (!pid) continue;
      if (!Number.isFinite(qty) || qty <= 0) continue;
      out.push({ productId: pid, qty });
    }
    const byId = new Map<string, number>();
    for (const it of out) byId.set(it.productId, (byId.get(it.productId) || 0) + it.qty);
    return Array.from(byId.entries()).map(([productId, qty]) => ({ productId, qty }));
  }, [lines]);

  const totalPreview = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p] as const));
    let total = 0;
    for (const it of itemsPayload) {
      const p = byId.get(it.productId);
      const unit = p?.priceCents ?? null;
      if (typeof unit === "number") total += Math.round(it.qty * unit);
    }
    return total;
  }, [itemsPayload, products]);

  async function submit() {
    if (itemsPayload.length === 0) {
      toast.add({ variant: "error", title: "Error", description: "Informe ao menos 1 item." });
      return;
    }

    const m = mode ?? (bookingId ? "booking" : "sale");
    if (m === "pick") {
      onSavedAction({ saleId: "", items: itemsPayload });
      onCloseAction();
      return;
    }

    setSaving(true);
    try {
      if (m === "booking" && bookingId) {
        await fetchAdminJSON(`/api/admin/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE", saleItems: itemsPayload }),
        });
        toast.add({ variant: "success", title: "Atendimento finalizado", description: "Consumo registrado." });
        onSavedAction({ saleId: "", items: itemsPayload });
        onCloseAction();
        return;
      }

      const r = (await fetchAdminJSON(`/api/admin/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, items: itemsPayload }),
      })) as { id?: string };

      toast.add({ variant: "success", title: "Venda registrada" });
      onSavedAction({ saleId: r?.id || "", items: itemsPayload });
      onCloseAction();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onCloseAction}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-[96] w-full max-w-2xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <button type="button" onClick={onCloseAction} className={btnGhost}>
                Close
              </button>
            </div>

            {showClientPicker && !bookingId && (mode ?? "sale") === "sale" && (
              <div className="mb-4">
                <label className="block text-sm text-[#C9CDD3] mb-1">Client (opcional)</label>
                <input
                  className={inputBase}
                  value={clientQ}
                  onChange={(e) => {
                    setClientQ(e.target.value);
                    setClientId(null);
                  }}
                  placeholder="Digite nome ou telefone"
                />

                {clientsLoading && <div className="mt-2"><Skeleton className="h-10 w-full" /></div>}
                {!clientsLoading && clientOptions.length > 0 && (
                  <div className="mt-2 rounded-md border border-[#2A2E36] bg-[#111318] overflow-hidden">
                    {clientOptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-[#1A1C1F] transition"
                        onClick={() => {
                          setClientId(c.id);
                          setClientQ(c.name);
                          setClientOptions([]);
                        }}
                      >
                        <div className="text-sm text-white">{c.name}</div>
                        {c.phoneRaw && <div className="text-xs text-[#9AA0A6]">{c.phoneRaw}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {productsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                      <div className="sm:col-span-4">
                        <label className="sr-only" htmlFor={`p-${idx}`}>Produto</label>
                        <select
                          id={`p-${idx}`}
                          className={inputBase}
                          value={l.productId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, productId: v } : x)));
                          }}
                        >
                          <option value="">Selecione um produto...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="sr-only" htmlFor={`q-${idx}`}>Qtd</label>
                        <input
                          id={`q-${idx}`}
                          className={inputBase}
                          inputMode="decimal"
                          value={l.qty}
                          onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Remover item"
                        >
                          Remover
                        </button>
                      </div>

                      {l.productId && (
                        <div className="sm:col-span-6 text-xs text-[#9AA0A6]">
                          {(() => {
                            const p = products.find((x) => x.id === l.productId);
                            if (!p) return null;
                            return `Inventory: ${p.stockQty} • Preço: ${centsToBRL(p.priceCents ?? null)}`;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}

                  <div>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => setLines((prev) => [...prev, { productId: "", qty: "1" }])}
                    >
                      + Adicionar item
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-5 gap-3">
              <div className="text-sm text-[#C9CDD3]">
                Total (prévia): <span className="text-white font-semibold">{centsToBRL(totalPreview)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onCloseAction} className={btnGhost} disabled={saving}>
                  Cancel
                </button>
                <button type="button" onClick={submit} className={btnPrimary} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
