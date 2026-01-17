"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

type LowStockItem = {
  id: string;
  name: string;
  stockQty: number;
  unit: string | null;
};

type Props = {
  initialThreshold?: number;
  autoRefreshMs?: number;
};

export default function LowStockCard({
  initialThreshold = 5,
  autoRefreshMs = 60_000,
}: Props) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState<number>(initialThreshold);
  const [error, setError] = useState("");

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-3 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const input =
    "w-20 rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-2 py-1";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = `/api/admin/products/low-stock?threshold=${encodeURIComponent(
        String(threshold || 0)
      )}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed ao carregar (${res.status})`);
      }
      const data: LowStockItem[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Error ao carregar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    load();
    const t = setInterval(load, autoRefreshMs);
    return () => clearInterval(t);
  }, [threshold, autoRefreshMs, load]);

  const total = items.length;

  return (
    <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-5 shadow-inner">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-white">Inventory baixo</h2>
          <p className="text-sm text-[#C9CDD3]">
            Products com saldo abaixo de{" "}
            <span className="text-indigo-400 font-semibold">{threshold}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#C9CDD3]">Mín.</label>
          <input
            className={input}
            type="number"
            step="0.01"
            min={0}
            value={Number.isFinite(threshold) ? threshold : 0}
            onChange={(e) => setThreshold(Number(e.target.value || 0))}
          />
          <button className={btnGhost} onClick={load} disabled={loading}>
            {loading ? "Atualizando..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-900/40 bg-rose-900/20 text-rose-300 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <ul className="divide-y divide-[#24272D]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-28" rounded="lg" />
            </li>
          ))}
        </ul>
      ) : total === 0 ? (
        <div className="text-[#9AA0A6]">No item crítico no momento.</div>
      ) : (
        <ul className="divide-y divide-[#24272D]">
          {items.map((it) => (
            <li key={it.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-medium truncate">{it.name}</div>
                <div className="text-xs text-[#C9CDD3]">
                  {typeof it.stockQty === "number" ? it.stockQty.toFixed(2) : "0"}
                  {it.unit ? ` ${it.unit}` : ""}
                </div>
              </div>
              <Link
                href="/painel/produtos"
                className={btnPrimary}
                title="Ir para a tela de produtos"
              >
                Repor estoque
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
