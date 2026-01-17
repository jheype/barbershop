"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#69707D] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

function parseMoneyToCents(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s) return 0;

  const compact = s.replace(/\s/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const sepIdx = Math.max(lastComma, lastDot);

  const hasDecimals = sepIdx >= 0 && /^\d{1,2}$/.test(compact.slice(sepIdx + 1).replace(/\D/g, ""));
  if (hasDecimals) {
    const intPart = compact.slice(0, sepIdx).replace(/\D/g, "");
    let decPart = compact.slice(sepIdx + 1).replace(/\D/g, "").slice(0, 2);
    if (decPart.length === 1) decPart = `${decPart}0`;
    if (decPart.length === 0) decPart = "00";
    const reais = Number(intPart || "0");
    const cents = Number(decPart || "0");
    if (!Number.isFinite(reais) || !Number.isFinite(cents)) return 0;
    return reais * 100 + cents;
  }

  const reaisOnly = compact.replace(/\D/g, "");
  const reais = Number(reaisOnly || "0");
  if (!Number.isFinite(reais)) return 0;
  return reais * 100;
}

export default function BarberAdvancesModal({
  open,
  barberId,
  onClose,
  onSaved,
}: {
  open: boolean;
  barberId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const title = useMemo(() => "Registrar vale", []);

  const onSubmit = useCallback(async () => {
    if (!barberId || saving) return;
    setSaving(true);

    try {
      const cents = parseMoneyToCents(amount || "0");
      if (!Number.isFinite(cents) || cents <= 0) throw new Error("Amount inválido.");
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");

      await fetchAdminJSON(`/api/admin/barbers/${barberId}/advances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          date: date || null,
          note: note.trim().slice(0, 160) || null,
        }),
      });

      onSaved();
      onClose();
      setAmount("");
      setDate("");
      setNote("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao registrar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [barberId, saving, amount, date, note, onSaved, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!saving) onClose();
            }}
          />

          <motion.div
            className="relative z-[91] w-full max-w-xl overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl max-h-[92vh]"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.85 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-[#24272D] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{title}</h3>
                <p className="mt-0.5 text-xs text-[#AEB4BE] break-words">Lance um vale/adiantamento.</p>
              </div>

              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-xs text-[#AEB4BE]">Amount</label>
                <input
                  className={inputBase}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 1500 ou 1500,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="text-xs text-[#AEB4BE]">Data (opcional)</label>
                <input className={inputBase} value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>

              <div>
                <label className="text-xs text-[#AEB4BE]">Note (opcional)</label>
                <input className={inputBase} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Até 160 caracteres" />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSubmit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}