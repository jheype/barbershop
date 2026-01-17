"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Barber = { id: string; name: string; photo?: string | null; active: boolean };

type Metrics = {
  barber: Barber;
  kpis: {
    doneBookings: number;
    uniqueClients: number;
    returningClients: number;
    retentionRate: number;
    workedMinutes: number;
    workedHours: number;
    revenue: number;
  };
  advances: { totalCents: number; items: Array<{ id: string; amountCents: number; note?: string | null; createdAt: string }> };
  salaries: { totalCents: number; items: Array<{ id: string; amountCents: number; note?: string | null; createdAt: string }> };
};

function centsToBRL(cents: number) {
  const v = (Number(cents) || 0) / 100;
  return v.toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

function money(v: number) {
  return (Number(v) || 0).toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  const p = Math.max(0, Math.min(1, Number(v) || 0)) * 100;
  return `${p.toFixed(0)}%`;
}

function photoSafe(url?: string | null) {
  const s = (url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

export default function BarberMetricsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const json = await fetchAdminJSON<Metrics>(`/api/admin/barbers/${id}/metrics`);
      setData(json);
    } catch (e) {
      setErr((e as Error).message || "Failed ao carregar metrics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(() => (data?.barber?.name ? `Métricas — ${data.barber.name}` : "Métricas do barbeiro"), [data]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-white truncate">{title}</h1>
          <p className="mt-1 text-sm text-[#9AA0A6]">
            Retenção, horas trabalhadas, vales e salários (baseado nos dados registrados no sistema).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-fuchsia-900/50 bg-fuchsia-900/20 p-4 text-sm text-fuchsia-200">
          {err}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-4 w-56" />
            <Skeleton className="mt-2 h-4 w-44" />
          </div>
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#C9CDD3]">
          Nenhuma informação disponível.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-[#24272D] bg-[#12141A]">
                {photoSafe(data.barber.photo) ? (
                  <Image src={data.barber.photo!} alt={data.barber.name} width={48} height={48} className="h-12 w-12 object-cover" />
                ) : (
                  <div className="h-12 w-12" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{data.barber.name}</div>
                <div className="text-xs text-[#9AA0A6]">{data.barber.active ? "Active" : "Inactive"}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Atendimentos (DONE)</div>
                <div className="mt-1 text-sm font-semibold text-white">{data.kpis.doneBookings}</div>
              </div>
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Receita</div>
                <div className="mt-1 text-sm font-semibold text-white">{money(data.kpis.revenue)}</div>
              </div>
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Horas trabalhadas</div>
                <div className="mt-1 text-sm font-semibold text-white">{data.kpis.workedHours.toFixed(1)}h</div>
              </div>
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Retenção</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {pct(data.kpis.retentionRate)}{" "}
                  <span className="text-xs font-normal text-[#9AA0A6]">
                    ({data.kpis.returningClients}/{data.kpis.uniqueClients})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-[#9AA0A6]">
              Note: retenção considera clientes com 2+ atendimentos do barbeiro.
            </div>
          </div>

          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">Financeiro</div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Vales (total)</div>
                <div className="mt-1 text-sm font-semibold text-white">{centsToBRL(data.advances.totalCents)}</div>
              </div>
              <div className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                <div className="text-xs text-[#C9CDD4]">Salários pagos (total)</div>
                <div className="mt-1 text-sm font-semibold text-white">{centsToBRL(data.salaries.totalCents)}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-[#C9CDD3]">Últimos vales</div>
              <div className="mt-2 space-y-2">
                {data.advances.items.slice(0, 8).map((a) => (
                  <div key={a.id} className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-[#C9CDD3]">{a.note || "Vale"}</div>
                      <div className="text-xs font-semibold text-white">{centsToBRL(a.amountCents)}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-[#9AA0A6]">
                      {new Date(a.createdAt).toLocaleString("en-GB")}
                    </div>
                  </div>
                ))}
                {!data.advances.items.length && (
                  <div className="text-xs text-[#9AA0A6]">No vale registrado.</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-[#C9CDD3]">Últimos salários</div>
              <div className="mt-2 space-y-2">
                {data.salaries.items.slice(0, 8).map((s) => (
                  <div key={s.id} className="rounded-xl border border-[#24272D] bg-[#0B0D10] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-[#C9CDD3]">{s.note || "Salário"}</div>
                      <div className="text-xs font-semibold text-white">{centsToBRL(s.amountCents)}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-[#9AA0A6]">
                      {new Date(s.createdAt).toLocaleString("en-GB")}
                    </div>
                  </div>
                ))}
                {!data.salaries.items.length && (
                  <div className="text-xs text-[#9AA0A6]">No salário registrado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
