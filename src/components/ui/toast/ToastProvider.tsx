"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast, type ToastPayload } from "./toast";

type ToastItem = ToastPayload & { id: string };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const off = toast.on((p) => {
      const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
      const item: ToastItem = {
        id,
        variant: "info",
        duration: 3200,
        ...p,
      };
      setToasts((prev) => [...prev, item]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, item.duration);
    });
    return off;
  }, []);

  return (
    <>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed z-[90] bottom-4 right-4 flex flex-col gap-3">
            {toasts.map((t) => (
              <ToastCard key={t.id} item={t} />
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const color =
    item.variant === "success"
      ? "border-emerald-600/60 bg-emerald-900/20 text-emerald-200"
      : item.variant === "error"
      ? "border-rose-600/60 bg-rose-900/20 text-rose-200"
      : "border-[#2A2E36] bg-[#0F1115] text-white";

  return (
    <div className={`min-w-[260px] max-w-[360px] rounded-xl border px-4 py-3 shadow-lg ${color}`}>
      {item.title && <div className="font-semibold mb-0.5">{item.title}</div>}
      {item.description && <div className="text-sm opacity-90">{item.description}</div>}
      {!item.title && !item.description && <div className="text-sm">Ação concluída.</div>}
    </div>
  );
}
