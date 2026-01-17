"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { confirmBus, type ConfirmOptions } from "./confirm";

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const lastActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return confirmBus.on((ev) => {
      lastActive.current = (document.activeElement as HTMLElement) || null;
      setPending({ options: ev.payload, resolve: ev.resolve });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
      setTimeout(() => lastActive.current?.focus?.(), 0);
    },
    [pending]
  );

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const node = (
    <>
      {children}
      <AnimatePresence>
        {pending && (
          <div className="fixed inset-0 z-[80]">
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => close(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-4"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
            >
              <div className="w-full max-w-md rounded-2xl border border-[#24272D] bg-[#0F1115] text-white shadow-2xl">
                <div className="p-5 md:p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
                      <span className="text-white font-bold">!</span>
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">
                        {pending.options.title || "Confirmação"}
                      </h2>
                      {pending.options.description && (
                        <p className="text-sm text-[#C9CDD3] mt-1">
                          {pending.options.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2">
                    <button
                      className="px-4 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition"
                      onClick={() => close(false)}
                      autoFocus
                    >
                      {pending.options.cancelText || "Cancel"}
                    </button>
                    <button
                      className={`px-4 py-2 rounded-md text-white transition ${
                        pending.options.confirmVariant === "danger"
                          ? "bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:opacity-95"
                          : "bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-95"
                      }`}
                      onClick={() => close(true)}
                    >
                      {pending.options.confirmText || "Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return typeof window !== "undefined" ? createPortal(node, document.body) : node;
}
