"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Product = { id: string; name: string; unit?: string | null };
type Linked = {
  id: string;
  productId: string;
  quantityPerService: number;
  product?: Product | null;
};

type Props = {
  open: boolean;
  serviceId: string | null;
  serviceName: string;
  onClose: () => void;
  onSaved: () => void;
};

function errMsg(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function ServiceProductsModal({ open, serviceId, serviceName, onClose, onSaved }: Props) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<Linked[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !serviceId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [prods, lks] = await Promise.all([
          fetchAdminJSON<Product[]>("/api/admin/products"),
          fetchAdminJSON<Linked[]>(`/api/admin/services/${serviceId}/products`),
        ]);

        if (!alive) return;
        setAllProducts(Array.isArray(prods) ? prods : []);
        setLinks(Array.isArray(lks) ? lks : []);
      } catch (err: unknown) {
        if (!alive) return;
        alert(errMsg(err, "Error ao carregar produtos"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, serviceId]);

  function addRow() {
    setLinks((prev) => [...prev, { id: crypto.randomUUID(), productId: "", quantityPerService: 1 }]);
  }

  function updateRow(idx: number, patch: Partial<Linked>) {
    setLinks((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!serviceId) return;

    const payload = {
      items: links
        .map((l) => ({
          productId: String(l.productId || ""),
          quantityPerService: Number(l.quantityPerService || 0),
        }))
        .filter((l) => l.productId && Number.isFinite(l.quantityPerService) && l.quantityPerService > 0),
    };

    try {
      await fetchAdminJSON<{ ok: true; count: number }>(`/api/admin/services/${serviceId}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (err: unknown) {
      alert(errMsg(err, "Error ao salvar produtos"));
    }
  }

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const btnDanger =
    "px-3 py-2 rounded-md border border-rose-800/50 text-rose-300 hover:bg-rose-900/20 transition whitespace-nowrap";
  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const select =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-[71] w-full max-w-3xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Products do serviço</h3>
                <p className="text-sm text-[#C9CDD3]">{serviceName}</p>
              </div>
              <button onClick={onClose} className={btnGhost}>
                Close
              </button>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10" rounded="lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24" rounded="lg" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10" rounded="lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-9 w-24" rounded="lg" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {links.map((row, idx) => {
                    const prod = allProducts.find((p) => p.id === row.productId);

                    return (
                      <div
                        key={row.id}
                        className="rounded-xl border border-[#24272D] bg-[#0B0D12] p-3 md:p-0 md:border-0 md:bg-transparent"
                      >
                        <div className="md:grid md:grid-cols-12 md:gap-2 md:items-center">
                          <div className="md:col-span-7">
                            <select
                              className={select}
                              value={row.productId || ""}
                              onChange={(e) => updateRow(idx, { productId: e.target.value })}
                            >
                              <option value="">Selecione um produto…</option>
                              {allProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.unit ? ` (${p.unit})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-2 flex gap-2 md:mt-0 md:col-span-5 md:grid md:grid-cols-5 md:gap-2 md:items-center">
                            <div className="flex-1 md:col-span-3 md:flex-none">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className={input}
                                value={String(row.quantityPerService ?? "")}
                                onChange={(e) => updateRow(idx, { quantityPerService: Number(e.target.value) })}
                                placeholder={prod?.unit ? `Qtd (${prod.unit})` : "Quantidade"}
                              />
                            </div>

                            <div className="shrink-0 md:col-span-2 md:flex md:justify-end">
                              <button className={btnDanger} onClick={() => removeRow(idx)}>
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <button className={btnGhost} onClick={addRow}>
                      + Adicionar produto
                    </button>
                    <button className={btnPrimary} onClick={save}>
                      Salvar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}