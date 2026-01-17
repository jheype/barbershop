"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Product = {
  id?: string;
  name: string;
  unit?: string | null;
  sku?: string | null;
  minStock?: number | null;
  stockQty?: number;
  cost?: number | null;
  price?: number | null;
  active?: boolean | null;
};

type Props = {
  open: boolean;
  product: Product | null;
  onCloseAction: () => void;
  onSaved: () => void;
};

type SavePayload = {
  name: string;
  unit: string | null;
  sku: string | null;
  minStock: number;
  cost: number;
  price: number;
  active: boolean;
  stockQty?: number;
};

export default function ProductForm({ open, product, onCloseAction, onSaved }: Props) {
  const isEdit = !!product?.id;

  const [name, setName] = useState(product?.name || "");
  const [unit, setUnit] = useState(product?.unit || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [minStock, setMinStock] = useState(product?.minStock ?? 0);
  const [stockQty, setStockQty] = useState(product?.stockQty ?? 0);
  const [cost, setCost] = useState(product?.cost ?? 0);
  const [price, setPrice] = useState(product?.price ?? 0);
  const [active, setActive] = useState(product?.active ?? true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setUnit(product?.unit || "");
    setSku(product?.sku || "");
    setMinStock(product?.minStock ?? 0);
    setStockQty(product?.stockQty ?? 0);
    setCost(product?.cost ?? 0);
    setPrice(product?.price ?? 0);
    setActive(product?.active ?? true);
    setErr("");
  }, [open, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const payload: SavePayload = {
        name: name.trim(),
        unit: unit || null,
        sku: sku || null,
        minStock: Number(minStock),
        cost: Number(cost),
        price: Number(price),
        active: Boolean(active),
      };
      if (!isEdit) payload.stockQty = Number(stockQty);

      const url = isEdit ? `/api/admin/products/${product!.id}` : `/api/admin/products`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Failed ao salvar produto");
      }
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error ao salvar";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onCloseAction}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.form
            onSubmit={handleSubmit}
            className="relative z-[71] w-full max-w-xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5 md:p-6"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
                  <span className="text-white font-bold">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{isEdit ? "Editar produto" : "Novo produto"}</h2>
                  <p className="text-sm text-[#C9CDD3]">{isEdit ? "Atualize os campos necessários." : "Preencha os dados do produto."}</p>
                </div>
              </div>
            </div>

            {err && (
              <div className="mb-3 rounded-lg border border-rose-800/50 bg-rose-900/20 text-rose-200 px-4 py-3 text-sm">
                {err}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Nome</label>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Unidade (ex.: ml, un, g)</label>
                <input className={input} value={unit ?? ""} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">SKU</label>
                <input className={input} value={sku ?? ""} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Inventory mínimo</label>
                <input type="number" className={input} value={minStock ?? 0} onChange={(e) => setMinStock(Number(e.target.value || 0))} />
              </div>

              {!isEdit && (
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Inventory inicial</label>
                  <input type="number" className={input} value={stockQty} onChange={(e) => setStockQty(Number(e.target.value || 0))} />
                </div>
              )}
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Custo (£)</label>
                <input type="number" step="0.01" className={input} value={cost ?? 0} onChange={(e) => setCost(Number(e.target.value || 0))} />
              </div>
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Preço (£)</label>
                <input type="number" step="0.01" className={input} value={price ?? 0} onChange={(e) => setPrice(Number(e.target.value || 0))} />
              </div>
              <label className="flex items-center gap-2 mt-2 text-[#C9CDD3]">
                <input type="checkbox" className="accent-indigo-500" checked={!!active} onChange={(e) => setActive(e.target.checked)} />
                Active
              </label>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-between">
              <button type="button" className={btnGhost} onClick={onCloseAction}>Cancel</button>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? "Salvando..." : isEdit ? "Save changes" : "Criar produto"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
