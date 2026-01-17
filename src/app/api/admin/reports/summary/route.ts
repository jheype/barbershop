import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function toDateOrNull(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const today = new Date();
    const defaultTo = endOfDay(today);
    const defaultFrom = startOfDay(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

    const fromDate = startOfDay(toDateOrNull(fromParam) ?? defaultFrom);
    const toDate = endOfDay(toDateOrNull(toParam) ?? defaultTo);

    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        status: { not: "CANCELED" },
      },
      include: {
        services: { include: { service: true } },
        barber: true,
      },
      orderBy: { date: "asc" },
    });

    let totalBookings = 0;
    let totalAgendados = 0;
    let totalConfirmados = 0;
    let totalFinalizados = 0;

    let faturadoFinalizados = 0;
    let faturadoConfirmados = 0;

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const byDayCount: Record<string, number> = {};
    const byDayRevenue: Record<string, number> = {};

    const porServico: Record<string, { name: string; count: number; revenue: number }> = {};
    const porBarber: Record<string, { name: string; count: number; revenue: number }> = {};

    for (const b of bookings) {
      totalBookings++;
      if (b.status === "SCHEDULED") totalAgendados++;
      if (b.status === "CONFIRMED") totalConfirmados++;
      if (b.status === "DONE") totalFinalizados++;

      const day = dayKey(new Date(b.date));
      byDayCount[day] = (byDayCount[day] || 0) + 1;

      const valorBooking = b.services.reduce(
        (acc: number, bs: typeof b.services[number]) => acc + (bs.service?.price ?? 0),
        0
      );

      if (b.status === "DONE") {
        faturadoFinalizados += valorBooking;
        byDayRevenue[day] = (byDayRevenue[day] || 0) + valorBooking;
      } else if (b.status === "CONFIRMED") {
        faturadoConfirmados += valorBooking;
      }

      for (const bs of b.services) {
        const s = bs.service;
        if (!s) continue;
        const key = s.id;
        if (!porServico[key]) porServico[key] = { name: s.name, count: 0, revenue: 0 };
        porServico[key].count += 1;
        if (b.status === "DONE") porServico[key].revenue += s.price;
      }

      if (b.barber) {
        const key = b.barber.id;
        if (!porBarber[key]) porBarber[key] = { name: b.barber.name, count: 0, revenue: 0 };
        porBarber[key].count += 1;
        if (b.status === "DONE") porBarber[key].revenue += valorBooking;
      }
    }

    const ticketMedio = totalFinalizados
      ? Number((faturadoFinalizados / totalFinalizados).toFixed(2))
      : 0;

    const lowStock = await prisma.product.findMany({
      where: {
        active: true,
        stockQty: { lt: 5 },
      },
      select: { id: true, name: true, stockQty: true, unit: true },
      orderBy: { stockQty: "asc" },
      take: 10,
    });

    const days: string[] = [];
    for (let t = new Date(fromDate); t <= toDate; t.setDate(t.getDate() + 1)) {
      days.push(dayKey(t));
    }
    const seriesBookingsPorDia = days.map((d) => ({ day: d, count: byDayCount[d] || 0 }));
    const seriesReceitaPorDia = days.map((d) => ({ day: d, revenue: Number((byDayRevenue[d] || 0).toFixed(2)) }));

    const topServicos = Object.values(porServico)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const topBarbers = Object.values(porBarber)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return NextResponse.json({
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      totals: {
        totalBookings,
        totalAgendados,
        totalConfirmados,
        totalFinalizados,
        faturadoFinalizados: Number(faturadoFinalizados.toFixed(2)),
        faturadoConfirmados: Number(faturadoConfirmados.toFixed(2)),
        ticketMedio,
      },
      series: {
        agendamentosPorDia: seriesBookingsPorDia,
        receitaPorDia: seriesReceitaPorDia,
      },
      top: {
        servicos: topServicos,
        barbeiros: topBarbers,
      },
      estoque: {
        lowStock,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/reports/summary FAILED:", e);
    return NextResponse.json({ error: "Error while  gerar report" }, { status: 500 });
  }
}
