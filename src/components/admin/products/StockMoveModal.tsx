"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type StockMoveKind = "IN" | "OUT" | "ADJUST";

type Props = {
  open: boolean;
  productId: string | null;
  productName: string | null;
  onCloseAction: () => void;
  onSavedAction: () => void;
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
const btnGhost =
  "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition disabled:opacity-50";

export default function StockMoveModal({ open, productId, productName, onCloseAction, onSavedAction }: Props) {
  const [kind, setKind] = useState<StockMoveKind>("IN");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("IN");
    setQty("1");
    setNote("");
  }, [open]);

  async function submit() {
    if (!productId) return;
    const q = Number(qty || 0);
    if (!Number.isFinite(q) || q <= 0) {
      toast.add({ variant: "error", title: "Error", description: "Quantidade inválida." });
      return;
    }

    setSaving(true);
    try {
      await fetchAdminJSON(`/api/admin/products/${productId}/moves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, qty: q, note: note.trim() || null }),
      });

      toast.add({ variant: "success", title: "Movimentação registrada" });
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
            className="relative z-[91] w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold text-white">Movimentar estoque</h3>
              <button type="button" onClick={onCloseAction} className={btnGhost}>
                Close
              </button>
            </div>

            <p className="text-sm text-[#C9CDD3] mb-4">{productName || "—"}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Tipo</label>
                <select
                  className={inputBase}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as StockMoveKind)}
                >
                  <option value="IN">Entrada</option>
                  <option value="OUT">Saída</option>
                  <option value="ADJUST">Ajuste (log)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Quantidade</label>
                <input className={inputBase} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm text-[#C9CDD3] mb-1">Note (opcional)</label>
                <input className={inputBase} value={note} onChange={(e) => setNote(e.target.value)} placeholder="..." />
              </div>
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
