"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Method = "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER";

type Props = {
  open: boolean;
  barberId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

function toCents(v: string) {
  const n = Number(String(v || "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function BarberPaymentModal({ open, barberId, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("PIX");
  const [loading, setLoading] = useState(false);

  const cents = useMemo(() => toCents(amount), [amount]);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setMethod("PIX");
    setLoading(false);
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!barberId) {
      toast.add({ variant: "error", title: "Error", description: "Barber inválido." });
      return;
    }
    if (!cents || cents <= 0) {
      toast.add({ variant: "error", title: "Amount inválido", description: "Informe um valor maior que 0." });
      return;
    }

    try {
      setLoading(true);

      await fetchAdminJSON(`/api/admin/barbers/${barberId}/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents, method }),
      });

      toast.add({ variant: "success", title: "Pagamento registrado", description: "Lançado no caixa." });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error ao registrar pagamento.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-[#2A2E36] bg-[#111318] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#E4E7EC]">Registrar pagamento</h2>
          <button onClick={onClose} className="text-sm text-[#AEB4BE] hover:text-white" type="button">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-[#AEB4BE] mb-1">Amount (£)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ex: 120"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-[#2A2E36] bg-[#0E1015] px-3 py-2 text-[#E4E7EC] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#AEB4BE] mb-1">Método</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="w-full rounded-md border border-[#2A2E36] bg-[#0E1015] px-3 py-2 text-[#E4E7EC] outline-none"
            >
              <option value="PIX">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="CARD_DEBIT">Cartão Débito</option>
              <option value="CARD_CREDIT">Cartão Crédito</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}