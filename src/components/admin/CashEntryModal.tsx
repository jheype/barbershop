"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Kind = "OPENING" | "IN" | "OUT" | "ADJUST" | "REFUND";

type Props = {
  open: boolean;
  defaultKind?: Kind;
  onClose: () => void;
  onSaved: () => void;
};

export default function CashEntryModal({
  open,
  defaultKind = "IN",
  onClose,
  onSaved,
}: Props) {
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [amount, setAmount] = useState<string>("0");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setAmount("0");
    setNote("");
    setLoading(false);
  }, [open, defaultKind]);

  const hint = useMemo(() => {
    switch (kind) {
      case "OPENING":
        return "Abertura do caixa (saldo inicial do dia).";
      case "IN":
        return "Entrada de dinheiro (ex.: venda avulsa, complemento).";
      case "OUT":
        return "Saída de dinheiro (ex.: despesas pequenas).";
      case "REFUND":
        return "Estorno/devolução para cliente.";
      case "ADJUST":
        return "Ajuste manual. Pode ser positivo ou negativo.";
    }
  }, [kind]);

  async function handleSave() {
    setLoading(true);
    try {
      const val = Number(amount);
      if (!Number.isFinite(val)) throw new Error("Informe um valor numérico.");

      await fetchAdminJSON("/api/admin/cash/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          amount: val,
          note: note.trim() ? note.trim() : null,
        }),
      });

      toast.add({
        variant: "success",
        title: "Lançamento registrado",
        description: "O movimento foi salvo no caixa.",
      });

      onSaved();
      onClose();
    } catch (err) {
      const e = err as Error;
      toast.add({
        variant: "error",
        title: "Error no lançamento",
        description: e.message || "Tente novamente.",
      });
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
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
            className="relative z-[81] w-full max-w-xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
                    <span className="text-white font-bold">£</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Novo lançamento</h2>
                    <p className="text-sm text-[#C9CDD3]">{hint}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Tipo</label>
                  <select
                    className={input}
                    value={kind}
                    onChange={(e) => setKind(e.target.value as Kind)}
                    disabled={loading}
                  >
                    <option value="OPENING">Abertura</option>
                    <option value="IN">Entrada</option>
                    <option value="OUT">Saída</option>
                    <option value="REFUND">Estorno</option>
                    <option value="ADJUST">Ajuste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Amount (£)</label>
                  <input
                    className={input}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-[#C9CDD3] mb-1">Note (opcional)</label>
                <input
                  className={input}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={loading}
                  placeholder="Ex.: compra de produtos, troco, etc."
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button className={btnGhost} onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button className={btnPrimary} onClick={handleSave} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
