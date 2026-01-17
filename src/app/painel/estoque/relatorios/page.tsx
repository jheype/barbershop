"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";

type SummaryItem = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  active: boolean;
  inQty: number;
  outQty: number;
  adjustQty: number;
  netQty: number;
};
type SummaryResponse = { items: SummaryItem[]; from: string; to: string };

type DailyItem = { date: string; inQty: number; outQty: number; adjustQty: number; netQty: number };
type DailyResponse = { items: DailyItem[]; from: string; to: string };

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function minusDaysYMD(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StockReportsPage() {
  const [from, setFrom] = useState(minusDaysYMD(29));
  const [to, setTo] = useState(todayYMD());

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btn =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const [sRes, dRes] = await Promise.all([
        fetch(`/api/admin/reports/stock-summary?${qs}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/stock-daily?${qs}`, { cache: "no-store" }),
      ]);
      const sJson = await sRes.json().catch(() => null);
      const dJson = await dRes.json().catch(() => null);
      setSummary(sJson && sJson.items ? sJson : { items: [], from, to });
      setDaily(dJson && dJson.items ? dJson : { items: [], from, to });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const filteredSummary = useMemo(() => {
    const list = summary?.items || [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (it) =>
        it.name.toLowerCase().includes(term) ||
        (it.sku || "").toLowerCase().includes(term)
    );
  }, [summary, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Reports de estoque</h1>
          <p className="text-sm text-[#C9CDD3]">Entradas, saídas, ajustes e saldo líquido por produto e por dia.</p>
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1 text-[#C9CDD3]">De</label>
          <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-48">
          <label className="block text-sm mb-1 text-[#C9CDD3]">Até</label>
          <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className={btn} onClick={load}>Refresh</button>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Série diária (Entradas/ Saídas/ Ajustes)</div>
          <div className="flex items-center gap-2">
            <a
              className={btnPrimary}
              href={`/api/admin/reports/stock-daily.csv?from=${from}&to=${to}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Exportar CSV
            </a>
          </div>
        </div>
        <div style={{ width: "100%", height: 300 }} className="mt-3">
          <ResponsiveContainer>
            <LineChart data={(daily?.items || []).map(i => ({ ...i, x: i.date.slice(5) }))}>
              <CartesianGrid stroke="#1a1c1f" />
              <XAxis dataKey="x" tick={{ fill: "#C9CDD3", fontSize: 12 }} />
              <YAxis tick={{ fill: "#C9CDD3", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0F1115", border: "1px solid #24272D", color: "#F5F7FA" }} />
              <Legend />
              <Line type="monotone" dataKey="inQty" name="Entradas" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="outQty" name="Saídas" stroke="#d946ef" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="adjustQty" name="Ajustes" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Resumo por produto</div>
          <div className="flex items-center gap-2">
            <input className={input} placeholder="Buscar produto/SKU..." value={q} onChange={(e) => setQ(e.target.value)} />
            <a
              className={btnPrimary}
              href={`/api/admin/reports/stock-summary.csv?from=${from}&to=${to}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 space-y-2">
  {Array.from({ length: 3 }).map((_, i) => (
    <div key={i} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-full" />
    </div>
  ))}
</div>
        ) : filteredSummary.length === 0 ? (
          <div className="mt-3 text-[#9AA0A6]">Sem dados no período.</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-x-auto rounded-xl border border-[#24272D]">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#12141A] text-[#C9CDD3]">
                  <tr>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">SKU</th>
                    <th className="p-2 text-left">Un</th>
                    <th className="p-2 text-right">Entradas</th>
                    <th className="p-2 text-right">Saídas</th>
                    <th className="p-2 text-right">Ajustes</th>
                    <th className="p-2 text-right">Saldo líq.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((it) => (
                    <tr key={it.id} className="hover:bg-[#12141A]">
                      <td className="p-2 border-t border-[#24272D]">{it.name}</td>
                      <td className="p-2 border-t border-[#24272D]">{it.sku || "—"}</td>
                      <td className="p-2 border-t border-[#24272D]">{it.unit || "un"}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.inQty}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.outQty}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.adjustQty}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.netQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={filteredSummary.map(s => ({
                  name: s.name,
                  entradas: s.inQty,
                  saídas: s.outQty,
                  ajustes: s.adjustQty,
                }))}>
                  <CartesianGrid stroke="#1a1c1f" />
                  <XAxis dataKey="name" tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#0F1115", border: "1px solid #24272D", color: "#F5F7FA" }} />
                  <Legend />
                  <Bar dataKey="entradas" fill="#16a34a" />
                  <Bar dataKey="saídas" fill="#d946ef" />
                  <Bar dataKey="ajustes" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}