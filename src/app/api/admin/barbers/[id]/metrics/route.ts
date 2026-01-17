import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export async function GET(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!id || !OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const barber = await prisma.barber.findUnique({
      where: { id },
      select: { id: true, name: true, photo: true, active: true },
    });
    if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { barberId: id, status: "DONE" },
      include: { services: { include: { service: true } } },
      orderBy: { date: "desc" },
    });

    let revenue = 0;
    let workedMin = 0;
    const clientKeys: string[] = [];
    for (const b of bookings) {
      let total = 0;
      let dur = 0;
      for (const s of b.services) {
        total += s.service?.price ?? 0;
        dur += s.service?.duration ?? 0;
      }
      revenue += total;
      workedMin += dur;

      const key = (b.clientId || b.clientName || "").trim();
      if (key) clientKeys.push(key);
    }

    const uniqueClients = uniq(clientKeys);
    const counts: Record<string, number> = {};
    for (const k of clientKeys) counts[k] = (counts[k] ?? 0) + 1;
    const returningClients = Object.values(counts).filter((c) => c >= 2).length;
    const retentionRate = uniqueClients.length ? returningClients / uniqueClients.length : 0;

    const advances = await prisma.barberAdvance.findMany({
      where: { barberId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amountCents: true, note: true, createdAt: true },
    });
    const salaryPayments = await prisma.barberSalaryPayment.findMany({
      where: { barberId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, amountCents: true, note: true, createdAt: true },
    });

    const sumCents = (rows: Array<{ amountCents: number }>) => rows.reduce((a, r) => a + (r.amountCents || 0), 0);

    return NextResponse.json({
      barber,
      kpis: {
        doneBookings: bookings.length,
        uniqueClients: uniqueClients.length,
        returningClients,
        retentionRate,
        workedMinutes: workedMin,
        workedHours: workedMin / 60,
        revenue,
      },
      advances: { totalCents: sumCents(advances), items: advances },
      salaries: { totalCents: sumCents(salaryPayments), items: salaryPayments },
    });
  } catch (e) {
    console.error("GET /api/admin/barbers/[id]/metrics FAILED:", e);
    return NextResponse.json({ error: "Error while loading metrics." }, { status: 500 });
  }
}
