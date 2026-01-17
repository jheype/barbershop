"use client";

type FavoriteBarber = { id: string; name: string; photo?: string | null };

function money(v: number) {
  return v.toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

export default function ClientMetrics({
  metrics,
  favoriteBarber,
}: {
  metrics: { ticketAvg: number | null; freqDays: number | null; lastVisitAt: string | null };
  favoriteBarber: FavoriteBarber | null;
}) {
  const freq = metrics.freqDays ? `${Math.round(metrics.freqDays)} dia(s)` : "—";
  const ticket = metrics.ticketAvg != null ? money(metrics.ticketAvg) : "—";

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
        <div className="text-xs text-[#C9CDD4]">Ticket médio</div>
        <div className="mt-1 text-sm text-[#E4E7EC]">{ticket}</div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
        <div className="text-xs text-[#C9CDD4]">Frequência</div>
        <div className="mt-1 text-sm text-[#E4E7EC]">{freq}</div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
        <div className="text-xs text-[#C9CDD4]">Última visita</div>
        <div className="mt-1 text-sm text-[#E4E7EC]">{fmtDate(metrics.lastVisitAt)}</div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
        <div className="text-xs text-[#C9CDD4]">Barber favorito</div>
        <div className="mt-1 text-sm text-[#E4E7EC]">{favoriteBarber?.name || "—"}</div>
      </div>
    </div>
  );
}