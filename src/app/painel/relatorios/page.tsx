"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

type DailyItem = { date: string; revenue: number; bookings: number };
type DailyResponse = { items: DailyItem[]; totalRevenue: number; totalBookings: number };

type TopServiceItem = { id: string; name: string; count: number; revenue: number; avgPrice: number };
type TopBarberItem = { id: string; name: string; bookings: number; revenue: number; avgTicket: number };

type HeatmapRow = { weekday: number; counts: number[] };
type HeatmapResp = { hours: number[]; rows: HeatmapRow[]; total: number };

type PayMethodKey = "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER";
type PayMethodResp = { total: number; byMethod: { method: PayMethodKey; amount: number }[] };

function fmtBRL(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

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

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const moneyTooltip = (value: unknown, name: unknown): [ReactNode, ReactNode] => {
  const num = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const label = typeof name === "string" || typeof name === "number" ? String(name) : "";
  return [fmtBRL(safe), label];
};

const passthroughTooltip = (value: unknown, name: unknown): [ReactNode, ReactNode] => {
  const label = typeof name === "string" || typeof name === "number" ? String(name) : "";
  return [value as ReactNode, label];
};

export default function ReportsPage() {
  const [from, setFrom] = useState(minusDaysYMD(29));
  const [to, setTo] = useState(todayYMD());

  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [topServices, setTopServices] = useState<TopServiceItem[]>([]);
  const [topBarbers, setTopBarbers] = useState<TopBarberItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapResp | null>(null);
  const [payMethods, setPayMethods] = useState<PayMethodResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });

      const [dRes, sRes, bRes, hRes, pRes] = await Promise.all([
        fetch(`/api/admin/reports/daily-revenue?${q.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/top-services?${q.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/top-barbers?${q.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/heatmap?${q.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/reports/payment-methods?${q.toString()}`, { cache: "no-store" }),
      ]);

      const dJson: DailyResponse | null = await dRes.json().catch(() => null);
      const sJson: { items?: TopServiceItem[] } | null = await sRes.json().catch(() => null);
      const bJson: { items?: TopBarberItem[] } | null = await bRes.json().catch(() => null);
      const hJson: HeatmapResp | null = await hRes.json().catch(() => null);
      const pJson: PayMethodResp | null = await pRes.json().catch(() => null);

      setDaily(dJson && dJson.items ? dJson : { items: [], totalRevenue: 0, totalBookings: 0 });
      setTopServices(sJson?.items ?? []);
      setTopBarbers(bJson?.items ?? []);
      setHeatmap(hJson && hJson.hours ? hJson : { hours: [], rows: [], total: 0 });
      setPayMethods(pJson && Array.isArray(pJson.byMethod) ? pJson : { total: 0, byMethod: [] });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const methodLabel = (m: PayMethodKey) => {
    if (m === "CASH") return "Dinheiro";
    if (m === "PIX") return "Pix";
    if (m === "CARD_DEBIT") return "Cartão (débito)";
    if (m === "CARD_CREDIT") return "Cartão (crédito)";
    return "Outros";
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const revenueData = useMemo(
    () =>
      (daily?.items ?? []).map((it) => ({
        date: it.date.slice(5),
        receita: it.revenue,
        atendimentos: it.bookings,
      })),
    [daily]
  );

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  function cellColor(v: number, max: number) {
    if (max <= 0) return "#1a1c1f";
    const t = Math.min(1, v / max);
    const h = 24;
    const s = 90;
    const l = Math.round(12 + t * 40);
    return `hsl(${h} ${s}% ${l}%)`;
  }

  const maxCount = useMemo(() => {
    if (!heatmap) return 0;
    return Math.max(0, ...heatmap.rows.flatMap((r) => r.counts));
  }, [heatmap]);

  return (
    <div className="space-y-8 text-[#F5F7FA]">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Reports</h1>
          <p className="text-sm text-[#C9CDD3]">
            Receita, atendimentos, serviços e barbeiros com melhor desempenho.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[#C9CDD3]">De</label>
          <input
            type="date"
            className={input}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[#C9CDD3]">Até</label>
          <input
            type="date"
            className={input}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button className={btnGhost} onClick={load}>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Receita total</div>
          <div className="text-3xl font-bold mt-1">
            {fmtBRL(daily?.totalRevenue ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Atendimentos</div>
          <div className="text-3xl font-bold mt-1">
            {daily?.totalBookings ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Ticket médio</div>
          <div className="text-3xl font-bold mt-1">
            {fmtBRL(
              daily?.totalBookings ? daily.totalRevenue / daily.totalBookings : 0
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-sm text-[#C9CDD3]">Entradas por forma de pagamento</div>
          <div className="text-3xl font-bold mt-1">
            {fmtBRL(payMethods?.total ?? 0)}
          </div>

          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <details className="mt-3">
              <summary className="cursor-pointer select-none text-sm text-[#C9CDD3] hover:text-white">
                Ver detalhamento
              </summary>
              <div className="mt-2 space-y-1">
                {(payMethods?.byMethod ?? []).map((it) => (
                  <div key={it.method} className="flex items-center justify-between text-sm">
                    <span className="text-[#C9CDD3]">{methodLabel(it.method)}</span>
                    <span className="font-semibold">{fmtBRL(it.amount)}</span>
                  </div>
                ))}
                {(payMethods?.byMethod ?? []).length === 0 ? (
                  <div className="text-sm text-[#9AA0A6]">Sem dados no período.</div>
                ) : null}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Receita diária */}
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Receita diária</div>
          <div className="text-xs text-[#9AA0A6]">
            {from} → {to}
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={revenueData}>
              <CartesianGrid stroke="#1a1c1f" />
              <XAxis dataKey="date" tick={{ fill: "#C9CDD3", fontSize: 12 }} />
              <YAxis tick={{ fill: "#C9CDD3", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#0F1115",
                  border: "1px solid #24272D",
                  color: "#F5F7FA",
                }}
                formatter={(value, name) =>
                  name === "receita"
                    ? moneyTooltip(value, name)
                    : passthroughTooltip(value, name)
                }
              />
              <Line
                type="monotone"
                dataKey="receita"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top serviços */}
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Top serviços por receita</div>
          <a
            className={btnPrimary}
            href={`/api/admin/reports/top-services.csv?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Exportar CSV
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
          </div>
        ) : topServices.length === 0 ? (
          <div className="text-[#9AA0A6]">Sem dados no período.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-x-auto rounded-xl border border-[#24272D]">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#12141A] text-[#C9CDD3]">
                  <tr>
                    <th className="p-2 text-left">Service</th>
                    <th className="p-2 text-right">Atend.</th>
                    <th className="p-2 text-right">Receita</th>
                    <th className="p-2 text-right">Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((it) => (
                    <tr key={it.id} className="hover:bg-[#12141A]">
                      <td className="p-2 border-t border-[#24272D]">{it.name}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.count}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{fmtBRL(it.revenue)}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{fmtBRL(it.avgPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={topServices.map((t) => ({ name: t.name, receita: t.revenue }))}>
                  <CartesianGrid stroke="#1a1c1f" />
                  <XAxis dataKey="name" tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#0F1115", border: "1px solid #24272D", color: "#F5F7FA" }}
                    formatter={(value, name) =>
                      name === "receita"
                        ? moneyTooltip(value, name)
                        : passthroughTooltip(value, name)
                    }
                  />
                  <Bar dataKey="receita" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top barbeiros */}
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Top barbeiros por receita</div>
          <a
            className={btnPrimary}
            href={`/api/admin/reports/top-barbers.csv?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Exportar CSV
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-8 w-28" rounded="lg" /></div>
          </div>
        ) : topBarbers.length === 0 ? (
          <div className="text-[#9AA0A6]">Sem dados no período.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-x-auto rounded-xl border border-[#24272D]">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#12141A] text-[#C9CDD3]">
                  <tr>
                    <th className="p-2 text-left">Barber</th>
                    <th className="p-2 text-right">Atend.</th>
                    <th className="p-2 text-right">Receita</th>
                    <th className="p-2 text-right">Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {topBarbers.map((it) => (
                    <tr key={it.id} className="hover:bg-[#12141A]">
                      <td className="p-2 border-t border-[#24272D]">{it.name}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{it.bookings}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{fmtBRL(it.revenue)}</td>
                      <td className="p-2 border-t border-[#24272D] text-right">{fmtBRL(it.avgTicket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={topBarbers.map((b) => ({ name: b.name, receita: b.revenue }))}>
                  <CartesianGrid stroke="#1a1c1f" />
                  <XAxis dataKey="name" tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#C9CDD3", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#0F1115", border: "1px solid #24272D", color: "#F5F7FA" }}
                    formatter={(value, name) =>
                      name === "receita"
                        ? moneyTooltip(value, name)
                        : passthroughTooltip(value, name)
                    }
                  />
                  <Bar dataKey="receita" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Heatmap de horários</div>
          <div className="text-xs text-[#9AA0A6]">
            {from} → {to}
          </div>
        </div>

        {!heatmap || heatmap.hours.length === 0 ? (
          <div className="text-[#9AA0A6]">Sem dados no período.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `80px repeat(${heatmap.hours.length}, 1fr)`,
                }}
              >
                <div className="text-xs text-[#C9CDD3] p-2 border-b border-[#24272D]">
                  Dia/Hora
                </div>
                {heatmap.hours.map((h) => (
                  <div
                    key={h}
                    className="text-xs text-[#C9CDD3] p-2 border-b border-[#24272D] text-center"
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}

                {heatmap.rows.map((row) => (
                  <Fragment key={`row-${row.weekday}`}>
                    <div className="text-sm text-[#E4E7EC] p-2 border-b border-[#24272D] sticky left-0 bg-[#0F1115]">
                      {WEEK_LABELS[row.weekday]}
                    </div>
                    {row.counts.map((v, i) => (
                      <div
                        key={`c-${row.weekday}-${i}`}
                        className="h-8 border-b border-[#24272D]"
                        title={`${WEEK_LABELS[row.weekday]} ${String(
                          heatmap.hours[i]
                        ).padStart(2, "0")}:00 – ${v} atendimento(s)`}
                        style={{ background: cellColor(v, maxCount) }}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs text-[#C9CDD3]">
                <span>Baixa</span>
                <div
                  className="h-3 w-32 rounded"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(24 90% 12%), hsl(24 90% 52%))",
                  }}
                />
                <span>Alta</span>
                <span className="ml-4 text-[#9AA0A6]">Máx: {maxCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}