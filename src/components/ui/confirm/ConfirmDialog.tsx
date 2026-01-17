"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancel",
  confirmTone = "primary",
  onClose,
  onConfirm,
}: Props) {
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnDanger =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-4 py-2 hover:opacity-95 transition";
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-[81] w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl p-5"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {description && <p className="mt-2 text-sm text-[#C9CDD3]">{description}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className={btnGhost} onClick={onClose}>{cancelText}</button>
              <button
                className={confirmTone === "danger" ? btnDanger : btnPrimary}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
