"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import SaleItemsModal from "@/components/admin/sales/SaleItemsModal";

type Props = {
  open: boolean;
  bookingId: string | null;
  total: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function PaymentModal({ open, bookingId, total, onClose, onSaved }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER">("CASH");
  const [discount, setDiscount] = useState<string>("0");
  const [surcharge, setSurcharge] = useState<string>("0");
  const [received, setReceived] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  const [saleItems, setSaleItems] = useState<Array<{ productId: string; qty: number }>>([]);
  const [itemsOpen, setItemsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMethod("CASH");
    setDiscount("0");
    setSurcharge("0");
    setReceived("0");
    setSaleItems([]);
  }, [open]);

  const net = useMemo(() => {
    const d = Math.max(Number(discount || 0), 0);
    const s = Math.max(Number(surcharge || 0), 0);
    return Math.max(total - d + s, 0);
  }, [total, discount, surcharge]);

  const change = useMemo(() => {
    if (method !== "CASH") return 0;
    const r = Math.max(Number(received || 0), 0);
    return Math.max(r - net, 0);
  }, [method, received, net]);

  async function submit() {
    if (!bookingId) return;
    setLoading(true);

    try {
      await fetchAdminJSON(`/api/admin/bookings/${bookingId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        discount: Number(discount || 0),
        surcharge: Number(surcharge || 0),
        amountReceived: Number(received || 0),
        markDone: true,
        saleItems,
      }),
      });

      toast.add({ variant: "success", title: "Pagamento registrado", description: "Lançado no caixa com sucesso." });
      onSaved();
      onClose();
      router.push("/painel/caixa");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }


  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const select =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-[86] w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <h3 className="text-lg font-bold text-white mb-4">Registrar pagamento</h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Forma</label>
                  <select
                    className={select}
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER")
                    }
                  >
                    <option value="CASH">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARD_DEBIT">Cartão Débito</option>
                    <option value="CARD_CREDIT">Cartão Crédito</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Total</label>
                  <input className={input} value={total.toFixed(2)} readOnly />
                </div>
              </div>

              <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-white">Products (bomboniere)</div>
                  <button className={btnGhost} type="button" onClick={() => setItemsOpen(true)}>
                    {saleItems.length ? "Editar" : "Adicionar"}
                  </button>
                </div>
                <div className="mt-2 text-xs text-[#C9CDD3]">
                  {saleItems.length ? `${saleItems.length} item(ns) selecionado(s).` : "No produto selecionado."}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Desconto</label>
                  <input className={input} type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Acréscimo</label>
                  <input className={input} type="number" step="0.01" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Total líquido</label>
                  <input className={input} value={net.toFixed(2)} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Recebido</label>
                  <input
                    className={input}
                    type="number"
                    step="0.01"
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                    disabled={method !== "CASH"}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#C9CDD3] mb-1">Troco</label>
                  <input className={input} value={change.toFixed(2)} readOnly />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button className={btnGhost} onClick={onClose}>Cancel</button>
                <button className={btnPrimary} disabled={loading || !bookingId} onClick={submit}>
                  {loading ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </div>
          </motion.div>

          <SaleItemsModal
            open={itemsOpen}
            title="Products consumidos"
            mode="pick"
            showClientPicker={false}
            onCloseAction={() => setItemsOpen(false)}
            onSavedAction={({ items }) => setSaleItems(items)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
