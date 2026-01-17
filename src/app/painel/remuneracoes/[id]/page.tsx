"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import BarberDetailsModal from "@/components/admin/barbers/BarberDetailsModal";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { centsToBRL } from "@/lib/money";
import BarberPaymentModal from "@/components/admin/barbers/BarberPaymentModal";

type PaymentMethod = "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER";

type Barber = { id: string; name: string; photo?: string | null; active?: boolean | null };

type Summary = {
  totalEarnedCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  advancesPendingCents: number;
};

type Item = {
  bookingId: string;
  date: string;
  clientName: string;
  servicesLabel: string;
  payoutType: string;
  paymentMethod: PaymentMethod | null;
  baseCents: number;
  earnedCents: number;
  paidCents: number;
  pendingCents: number;
};

type SalaryRow = { id: string; amountCents: number; dateKey: string; note: string | null; createdAt: string };
type AdvanceRow = { id: string; amountCents: number; dateKey: string; note: string | null; createdAt: string };

function photoSafe(url?: string | null) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { timeZone: "America/Sao_Paulo" });
}

function methodLabel(m: PaymentMethod | null) {
  if (!m) return "—";
  switch (m) {
    case "CASH":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "CARD_DEBIT":
      return "Débito";
    case "CARD_CREDIT":
      return "Crédito";
    default:
      return "Outro";
  }
}

export default function RemuneracaoBarbeiroPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<SalaryRow[]>([]);
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const r = (await fetchAdminJSON(`/api/admin/remunerations/${id}`)) as {
        barber: Barber;
        summary: Summary;
        items: Item[];
        payments: SalaryRow[];
        advances: AdvanceRow[];
      };

      setBarber(r.barber);
      setSummary(r.summary);
      setItems(Array.isArray(r.items) ? r.items : []);
      setPayments(Array.isArray(r.payments) ? r.payments : []);
      setAdvances(Array.isArray(r.advances) ? r.advances : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error ao carregar.";
      toast.add({ variant: "error", title: "Error", description: msg });
      router.replace("/painel/remuneracoes");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const header = useMemo(() => {
    if (!barber) return null;

    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="text-[#AEB4BE] hover:text-white transition"
            onClick={() => router.push("/painel/remuneracoes")}
          >
            ←
          </button>

          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-[#2A2E36] bg-[#111318]">
            {photoSafe(barber.photo) ? (
              <Image src={barber.photo as string} alt={barber.name} fill className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[#AEB4BE] text-xs">—</div>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-white truncate">{barber.name}</h1>
            <p className="text-xs text-[#AEB4BE] truncate">Histórico de serviços e pagamentos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition"
            onClick={() => setDetailsOpen(true)}
          >
            Abrir modal
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition"
            onClick={() => setPaymentOpen(true)}
          >
            Registrar pagamento
          </button>
        </div>
      </div>
    );
  }, [barber, router]);

  return (
    <div className="p-4 md:p-6">
      {header}

      <BarberDetailsModal open={detailsOpen} barberId={barber?.id ?? null} onClose={() => setDetailsOpen(false)} onSaved={load} />

      <BarberPaymentModal
        open={paymentOpen}
        barberId={barber?.id ?? null}
        onClose={() => setPaymentOpen(false)}
        onSaved={load}
      />

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32 mt-3" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <div className="text-xs text-[#AEB4BE]">Total</div>
              <div className="text-lg font-bold text-white mt-1">{centsToBRL(summary.totalEarnedCents)}</div>
            </div>
            <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <div className="text-xs text-[#AEB4BE]">Pago</div>
              <div className="text-lg font-bold text-white mt-1">{centsToBRL(summary.totalPaidCents)}</div>
            </div>
            <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <div className="text-xs text-[#AEB4BE]">Pendente</div>
              <div className="text-lg font-bold text-white mt-1">{centsToBRL(summary.totalPendingCents)}</div>
            </div>
            <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
              <div className="text-xs text-[#AEB4BE]">Vales pendentes</div>
              <div className="text-lg font-bold text-white mt-1">{centsToBRL(summary.advancesPendingCents)}</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 rounded-2xl border border-[#24272D] bg-[#0F1115] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#24272D]">
            <h2 className="text-white font-semibold">Histórico de serviços</h2>
            <p className="text-xs text-[#AEB4BE] mt-1">
              Base, ganho, pago e pendente (alocação do pago do mais antigo para o mais novo).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#AEB4BE] text-xs">
                <tr className="border-b border-[#24272D]">
                  <th className="text-left font-medium px-4 py-3">Data</th>
                  <th className="text-left font-medium px-4 py-3">Client / Services</th>
                  <th className="text-left font-medium px-4 py-3">Recebimento</th>
                  <th className="text-left font-medium px-4 py-3">Base</th>
                  <th className="text-left font-medium px-4 py-3">Ganho</th>
                  <th className="text-left font-medium px-4 py-3">Pago</th>
                  <th className="text-left font-medium px-4 py-3">Pendente</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#24272D]">
                        <td className="px-4 py-3" colSpan={7}>
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  : items.map((it) => (
                      <tr key={it.bookingId} className="border-b border-[#24272D] hover:bg-[#111318] transition">
                        <td className="px-4 py-3 text-[#C9CDD3] whitespace-nowrap">{fmtDate(it.date)}</td>
                        <td className="px-4 py-3 min-w-[260px]">
                          <div className="text-white font-medium">{it.clientName}</div>
                          <div className="text-xs text-[#AEB4BE] mt-1 truncate">{it.servicesLabel}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white">{it.payoutType}</div>
                          <div className="text-xs text-[#AEB4BE] mt-1">Pagamento: {methodLabel(it.paymentMethod)}</div>
                        </td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{centsToBRL(it.baseCents)}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{centsToBRL(it.earnedCents)}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{centsToBRL(it.paidCents)}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">{centsToBRL(it.pendingCents)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#24272D]">
            <h2 className="text-white font-semibold">Histórico de pagamentos</h2>
          </div>

          <div className="p-4 space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : payments.length ? (
              payments
                .slice()
                .reverse()
                .map((p) => (
                  <div key={p.id} className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white font-semibold">{centsToBRL(Math.abs(p.amountCents || 0))}</div>
                      <div className="text-xs text-[#AEB4BE]">{p.dateKey || fmtDate(p.createdAt)}</div>
                    </div>
                    {p.note ? <div className="text-xs text-[#AEB4BE] mt-1">{p.note}</div> : null}
                  </div>
                ))
            ) : (
              <div className="text-sm text-[#AEB4BE]">No pagamento registrado.</div>
            )}

            <div className="pt-3 border-t border-[#24272D]">
              <h3 className="text-white font-semibold">Vales</h3>
              <p className="text-xs text-[#AEB4BE] mt-1">Registrados pelo BarberDetailModal.</p>

              <div className="mt-2 space-y-2">
                {loading ? null : advances.length ? (
                  advances
                    .slice()
                    .reverse()
                    .map((a) => (
                      <div key={a.id} className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-white font-semibold">{centsToBRL(Math.abs(a.amountCents || 0))}</div>
                          <div className="text-xs text-[#AEB4BE]">{a.dateKey || fmtDate(a.createdAt)}</div>
                        </div>
                        {a.note ? <div className="text-xs text-[#AEB4BE] mt-1">{a.note}</div> : null}
                      </div>
                    ))
                ) : (
                  <div className="text-sm text-[#AEB4BE] mt-2">No vale registrado.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}