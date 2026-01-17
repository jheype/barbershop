"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { centsToBRL } from "@/lib/money";

type Row = {
  id: string;
  name: string;
  stockQty: number;
  costCents: number | null;
  priceCents: number | null;
  active: boolean;
  serviceQty: number;
  saleQty: number;
  manualQty: number;
  serviceCostCents: number;
  manualCostCents: number;
};

type Payload = {
  range: { days: number; from: string };
  topUsedService: Row[];
  topCostService: Row[];
  topWasteCost: Row[];
};

function n(v: number) {
  return (Number(v) || 0).toLocaleString("en-GB");
}

export default function ProductMetricsPage() {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const json = await fetchAdminJSON<Payload>(`/api/admin/products/metrics?days=90`);
      setData(json);
    } catch (e) {
      setErr((e as Error).message || "Failed ao carregar metrics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const Card = ({
    title,
    subtitle,
    rows,
    valueLabel,
    valueOf,
    secondaryOf,
    secondaryLabel,
  }: {
    title: string;
    subtitle: string;
    rows: Row[];
    valueLabel: string;
    valueOf: (r: Row) => string;
    secondaryLabel?: string;
    secondaryOf?: (r: Row) => string;
  }) => (
    <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{title}</div>
          <div className="mt-0.5 text-xs text-[#9AA0A6]">{subtitle}</div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#C9CDD3]">
              <th className="text-left p-2">Produto</th>
              <th className="text-right p-2">{valueLabel}</th>
              {secondaryLabel ? <th className="text-right p-2">{secondaryLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#24272D] hover:bg-[#12141A]">
                <td className="p-2 text-[#E4E7EC]">
                  <div className="flex flex-col">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-[11px] text-[#9AA0A6]">Inventory: {n(r.stockQty)}</span>
                  </div>
                </td>
                <td className="p-2 text-right text-[#E4E7EC]">{valueOf(r)}</td>
                {secondaryLabel && secondaryOf ? (
                  <td className="p-2 text-right text-[#E4E7EC]">{secondaryOf(r)}</td>
                ) : null}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3 text-xs text-[#9AA0A6]" colSpan={secondaryLabel ? 3 : 2}>
                  Sem dados no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-[#9AA0A6]">
        Nota: “Perda” aqui representa saídas manuais (OUT) que não são consumo de serviço (booking/cycle) nem venda (sale).
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-white">Métricas — Products</h1>
          <p className="mt-1 text-sm text-[#9AA0A6]">Últimos 90 dias (consumo, custo e saídas manuais).</p>
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
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#C9CDD3]">
          Nenhuma informação disponível.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card
            title="Produto mais usado (serviços)"
            subtitle={`Consumo por serviços no período.`}
            rows={data.topUsedService}
            valueLabel="Qtd"
            valueOf={(r) => n(r.serviceQty)}
            secondaryLabel="Custo"
            secondaryOf={(r) => centsToBRL(r.serviceCostCents)}
          />
          <Card
            title="Maior custo por consumo (serviços)"
            subtitle={`Estimativa de custo: qty × custo unitário (quando informado).`}
            rows={data.topCostService}
            valueLabel="Custo"
            valueOf={(r) => centsToBRL(r.serviceCostCents)}
            secondaryLabel="Qtd"
            secondaryOf={(r) => n(r.serviceQty)}
          />
          <div className="md:col-span-2">
            <Card
              title="Perda / saídas manuais (aproximação)"
              subtitle={`Saídas não atribuídas a serviço ou venda.`}
              rows={data.topWasteCost}
              valueLabel="Custo"
              valueOf={(r) => centsToBRL(r.manualCostCents)}
              secondaryLabel="Qtd"
              secondaryOf={(r) => n(r.manualQty)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
