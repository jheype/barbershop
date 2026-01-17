import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

function clampISO(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : d;
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";
type BookingWhere = {
  date?: { gte?: Date; lt?: Date };
  status?: BookingStatus | { not?: BookingStatus };
  barberId?: string;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const from = clampISO(String(url.searchParams.get("from") || ""));
    const to = clampISO(String(url.searchParams.get("to") || ""));
    const barberId = url.searchParams.get("barberId");
    const serviceId = url.searchParams.get("serviceId");

    if (!from || !to) {
      return NextResponse.json({ items: [], totalRevenue: 0, totalBookings: 0 });
    }

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);

    const whereBooking: BookingWhere = {
      date: { gte: start, lt: end },
      status: { not: "CANCELED" },
    };
    if (barberId && OID.test(barberId)) whereBooking.barberId = barberId;

    const bookings = await prisma.booking.findMany({
      where: whereBooking,
      include: { services: { include: { service: true } } },
      orderBy: { date: "asc" },
    });

    const filtered = bookings.map((b: typeof bookings[number]) => {
      const services = b.services.filter((bs: typeof b.services[number]) =>
        serviceId && OID.test(serviceId) ? bs.serviceId === serviceId : true
      );
      return { ...b, services };
    });

    let totalRevenue = 0;
    let totalBookings = 0;
    const byDayMap = new Map<string, { revenue: number; bookings: number }>();

    for (const b of filtered as Array<typeof filtered[number]>) {
      const revenue = b.services.reduce((acc: number, s: typeof b.services[number]) => acc + (s.service?.price ?? 0), 0);
      if (revenue > 0) {
        totalRevenue += revenue;
        totalBookings += 1;
        const day = ymd(new Date(b.date));
        const prev = byDayMap.get(day) || { revenue: 0, bookings: 0 };
        byDayMap.set(day, { revenue: prev.revenue + revenue, bookings: prev.bookings + 1 });
      }
    }

    const items: { date: string; revenue: number; bookings: number }[] = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const key = ymd(d);
      const v = byDayMap.get(key) || { revenue: 0, bookings: 0 };
      items.push({ date: key, revenue: v.revenue, bookings: v.bookings });
    }

    return NextResponse.json({ items, totalRevenue, totalBookings });
  } catch {
    return NextResponse.json({ items: [], totalRevenue: 0, totalBookings: 0 });
  }
}
