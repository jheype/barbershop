"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import MoneyInput from "@/components/ui/MoneyInput";

export type ProductDTO = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  stockQty: number;
  active: boolean;
  costCents?: number | null;
  priceCents?: number | null;
};

type Props = {
  open: boolean;
  product: ProductDTO | null;
  onCloseAction: () => void;
  onSavedAction: () => void;
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
const btnGhost =
  "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition disabled:opacity-50";

export default function ProductEditorModal({ open, product, onCloseAction, onSavedAction }: Props) {
  const isEdit = !!product;
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [active, setActive] = useState(true);
  const [costCents, setCostCents] = useState<number | null>(null);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setSku(product?.sku ?? "");
    setUnit(product?.unit ?? "");
    setStockQty(String(product?.stockQty ?? 0));
    setActive(product?.active ?? true);
    setCostCents(product?.costCents ?? null);
    setPriceCents(product?.priceCents ?? null);
  }, [open, product]);

  const payload = useMemo(() => {
    const q = Number(stockQty || 0);
    return {
      name: name.trim(),
      sku: sku.trim() || null,
      unit: unit.trim() || null,
      stockQty: Number.isFinite(q) ? q : 0,
      active,
      costCents,
      priceCents,
    };
  }, [name, sku, unit, stockQty, active, costCents, priceCents]);

  async function submit() {
    if (!payload.name) {
      toast.add({ variant: "error", title: "Error", description: "Nome é obrigatório." });
      return;
    }
    if (payload.stockQty < 0) {
      toast.add({ variant: "error", title: "Error", description: "Inventory não pode ser negativo." });
      return;
    }

    setSaving(true);
    try {
      if (isEdit && product) {
        await fetchAdminJSON(`/api/admin/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchAdminJSON(`/api/admin/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      toast.add({ variant: "success", title: "Salvo", description: "Produto atualizado." });
      onSavedAction();
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
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
            className="relative z-[91] w-full max-w-xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-white">{isEdit ? "Editar produto" : "Novo produto"}</h3>
              <button type="button" onClick={onCloseAction} className={btnGhost}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm text-[#C9CDD3] mb-1">Nome</label>
                <input
                  className={inputBase}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Refrigerante"
                />
              </div>

              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">SKU (opcional)</label>
                <input className={inputBase} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Código" />
              </div>

              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Unidade (opcional)</label>
                <input
                  className={inputBase}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="un"
                />
              </div>

              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Inventory</label>
                <input
                  className={inputBase}
                  inputMode="numeric"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-[#C9CDD3]">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Active
                </label>
              </div>

              <MoneyInput
                id="costCents"
                label="Custo unitário (opcional)"
                valueCents={costCents}
                onChangeCentsAction={setCostCents}
                placeholder="0,00"
                className={inputBase}
              />

              <MoneyInput
                id="priceCents"
                label="Preço de venda (opcional)"
                valueCents={priceCents}
                onChangeCentsAction={setPriceCents}
                placeholder="0,00"
                className={inputBase}
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={onCloseAction} className={btnGhost} disabled={saving}>
                Cancel
              </button>
              <button type="button" onClick={submit} className={btnPrimary} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
