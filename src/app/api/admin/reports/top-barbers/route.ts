import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function parseYMD(s: string | null) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function rangeForDay(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    const fromDay = parseYMD(fromStr);
    const toDay = parseYMD(toStr);

    if (!fromDay || !toDay) {
      return NextResponse.json(
        { error: "Parameters from/to invalid. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const { start: startFrom } = rangeForDay(fromDay);
    const { end: endTo } = rangeForDay(toDay);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "DONE",
        barberId: { not: null },
        date: { gte: startFrom, lt: endTo },
      },
      include: {
        barber: { select: { id: true, name: true } },
        services: { include: { service: { select: { id: true, name: true, price: true } } } },
      },
    });

    type BookingT = typeof bookings[number];

    type Agg = {
      id: string;
      name: string;
      bookings: number;
      revenue: number;
    };

    const map = new Map<string, Agg>();

    for (const b of bookings as BookingT[]) {
      if (!b.barber) continue;
      const key = b.barber.id;
      if (!map.has(key)) {
        map.set(key, { id: key, name: b.barber.name, bookings: 0, revenue: 0 });
      }
      const entry = map.get(key)!;
      entry.bookings += 1;
      const sum = b.services.reduce(
        (acc: number, bs: BookingT["services"][number]) => acc + (bs.service?.price || 0),
        0
      );
      entry.revenue += sum;
    }

    const items = Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((it) => ({
        id: it.id,
        name: it.name,
        bookings: it.bookings,
        revenue: Number(it.revenue.toFixed(2)),
        avgTicket: it.bookings ? Number((it.revenue / it.bookings).toFixed(2)) : 0,
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/admin/reports/top-barbers FAILED:", e);
    return NextResponse.json({ error: "Error while  gerar report" }, { status: 500 });
  }
}
