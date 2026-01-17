"use client";

import { useEffect, useState, useCallback } from "react";
import CashEntryModal from "@/components/admin/CashEntryModal";
import { Skeleton } from "@/components/ui/Skeleton";

type Summary = {
  from: string;
  to: string;
  kpis: {
    opening: number;
    sales: number;
    in: number;
    out: number;
    refund: number;
    adjust: number;
    inflow: number;
    outflow: number;
    balance: number;
  };
};

type Entry = {
  id: string;
  kind: "OPENING" | "IN" | "OUT" | "SALE" | "REFUND" | "ADJUST";
  amount: number;
  note?: string | null;
  createdAt: string;
  paymentId?: string | null;
  paymentMethod?: "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER" | null;
};

type RawEntry = Omit<Entry, "paymentMethod"> & {
  payment?: { method?: Entry["paymentMethod"] } | null;
};

type EntriesResponse = { items: RawEntry[] };

function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmt(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

export default function CashPage() {
  const [from, setFrom] = useState(ymd());
  const [to, setTo] = useState(ymd());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [defaultKind, setDefaultKind] = useState<"OPENING" | "IN" | "OUT" | "REFUND" | "ADJUST">("IN");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      const [sRes, eRes] = await Promise.all([
        fetch(`/api/admin/cash/summary?${q.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/cash/entries?${q.toString()}`, { cache: "no-store" }),
      ]);

      const sJson: Summary = await sRes.json();
      const eJson: EntriesResponse = await eRes.json();

      setSummary(sJson);

      const mapped: Entry[] = Array.isArray(eJson?.items)
        ? eJson.items.map((it) => ({
            id: it.id,
            kind: it.kind,
            amount: it.amount,
            note: it.note ?? null,
            createdAt: it.createdAt,
            paymentId: it.paymentId ?? null,
            paymentMethod: it.payment?.method ?? null,
          }))
        : [];

      setEntries(mapped);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const badge = (k: Entry["kind"]) => {
    const base = "text-xs rounded px-2 py-0.5 border";
    switch (k) {
      case "OPENING":
        return `${base} border-blue-700/50 text-blue-300 bg-blue-900/10`;
      case "SALE":
        return `${base} border-emerald-700/50 text-emerald-300 bg-emerald-900/10`;
      case "IN":
        return `${base} border-sky-700/50 text-sky-300 bg-sky-900/10`;
      case "OUT":
        return `${base} border-rose-700/50 text-rose-300 bg-rose-900/10`;
      case "REFUND":
        return `${base} border-amber-700/50 text-amber-300 bg-amber-900/10`;
      case "ADJUST":
        return `${base} border-purple-700/50 text-purple-300 bg-purple-900/10`;
      default:
        return base;
    }
  };

  const btn =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const btnGrad =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-3 py-2 hover:opacity-95 transition";
  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Cashier</h1>
          <p className="text-sm text-[#C9CDD3]">Resumo e extrato de movimentações em dinheiro.</p>
        </div>
        <div>
          <label className="block text-sm mb-1 text-[#C9CDD3]">De</label>
          <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[#C9CDD3]">Até</label>
          <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className={btn} onClick={load}>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Saldo no período</div>
          <div className="text-3xl font-bold mt-1">{fmt(summary?.kpis.balance || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Entradas</div>
          <div className="text-3xl font-bold mt-1">{fmt(summary?.kpis.inflow || 0)}</div>
        </div>
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Saídas</div>
          <div className="text-3xl font-bold mt-1">{fmt(summary?.kpis.outflow || 0)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={btnGrad}
          onClick={() => {
            setDefaultKind("OPENING");
            setModalOpen(true);
          }}
        >
          Abertura
        </button>
        <button
          className={btn}
          onClick={() => {
            setDefaultKind("IN");
            setModalOpen(true);
          }}
        >
          Entrada
        </button>
        <button
          className={btn}
          onClick={() => {
            setDefaultKind("OUT");
            setModalOpen(true);
          }}
        >
          Saída
        </button>
        <button
          className={btn}
          onClick={() => {
            setDefaultKind("REFUND");
            setModalOpen(true);
          }}
        >
          Estorno
        </button>
        <button
          className={btn}
          onClick={() => {
            setDefaultKind("ADJUST");
            setModalOpen(true);
          }}
        >
          Ajuste
        </button>

        <a className={btn} href={`/api/admin/cash/entries.csv?from=${from}&to=${to}`} target="_blank" rel="noopener noreferrer">
          Extrato CSV
        </a>
        <a className={btn} href={`/api/admin/cash/close.csv?date=${to}`} target="_blank" rel="noopener noreferrer">
          Fechamento do dia (CSV)
        </a>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#12141A] text-[#C9CDD3]">
            <tr>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Obs</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="hover:bg-[#12141A]">
                  <td className="p-2 border-t border-[#24272D]">
                    <Skeleton className="h-4 w-44" />
                  </td>
                  <td className="p-2 border-t border-[#24272D]">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="p-2 border-t border-[#24272D] text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </td>
                  <td className="p-2 border-t border-[#24272D]">
                    <Skeleton className="h-4 w-64" />
                  </td>
                </tr>
              ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td className="p-4 text-center text-[#9AA0A6]" colSpan={4}>
                  Sem entries.
                </td>
              </tr>
            )}
            {!loading &&
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-[#12141A]">
                  <td className="p-2 border-t border-[#24272D]">{new Date(e.createdAt).toLocaleString("en-GB")}</td>
                  <td className="p-2 border-t border-[#24272D]">
                    <span className={badge(e.kind)}>{e.kind}</span>
                  </td>
                  <td className="p-2 border-t border-[#24272D] text-right">{fmt(e.amount)}</td>
                  <td className="p-2 border-t border-[#24272D]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words whitespace-normal">{e.note || "-"}</span>
                      {e.kind === "SALE" && e.paymentMethod && (
                        <span className="text-[10px] rounded px-2 py-0.5 border border-[#24272D] text-[#C9CDD3]">
                          {e.paymentMethod === "CARD_DEBIT"
                            ? "Débito"
                            : e.paymentMethod === "CARD_CREDIT"
                              ? "Crédito"
                              : e.paymentMethod === "CASH"
                                ? "Dinheiro"
                                : e.paymentMethod === "PIX"
                                  ? "Pix"
                                  : "Outro"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <CashEntryModal
        open={modalOpen}
        defaultKind={defaultKind}
        onClose={() => setModalOpen(false)}
        onSaved={() => load()}
      />
    </div>
  );
}