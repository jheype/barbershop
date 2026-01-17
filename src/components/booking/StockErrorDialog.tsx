"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type Shortage = {
  productId?: string;
  productName?: string;
  need?: number;
  have?: number;
};

type Props = {
  open: boolean;
  title?: string;
  message: string;
  details?: Shortage[];
  onClose: () => void;
};

export default function StockErrorDialog({
  open,
  title = "Não foi possível concluir",
  message,
  details,
  onClose,
}: Props) {
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";

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
            className="relative z-[81] w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
                <span className="text-white font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-1 text-sm text-[#C9CDD3]">{message}</p>
                {Array.isArray(details) && details.length > 0 && (
                  <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-[#E4E7EC]">
                    {details.map((d, i) => (
                      <li key={i}>
                        {(d.productName || d.productId || "Item") +
                          (typeof d.need !== "undefined" || typeof d.have !== "undefined"
                            ? ` — necessário: ${d.need ?? "?"} • disponível: ${d.have ?? "0"}`
                            : "")}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button className={btnGhost} onClick={onClose}>
                    Close
                  </button>
                  <Link href="/" className={btnPrimary}>
                    Back ao início
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
