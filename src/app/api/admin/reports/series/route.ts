import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type Point = {
  date: string;
  scheduled: number;
  confirmed: number;
  done: number;
  canceled: number;
  revenue: number;
};

function parseDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function rangeDays(from: Date, to: Date) {
  const out: Date[] = [];
  const cur = new Date(from);
  while (cur < to) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json({ error: "Parameters from/to required" }, { status: 400 });
    }
    if (!(from < to)) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: { date: { gte: from, lt: to } },
      include: { services: { include: { service: true } } },
    });

    type BookingWithServices = typeof bookings[number];

    const days = rangeDays(from, to);
    const map = new Map<string, Point>();
    for (const d of days) {
      const key = toISODate(d);
      map.set(key, { date: key, scheduled: 0, confirmed: 0, done: 0, canceled: 0, revenue: 0 });
    }

    for (const b of bookings as BookingWithServices[]) {
      const key = toISODate(new Date(b.date));
      const p = map.get(key);
      if (!p) continue;
      if (b.status === "SCHEDULED") p.scheduled += 1;
      else if (b.status === "CONFIRMED") p.confirmed += 1;
      else if (b.status === "DONE") {
        p.done += 1;
        const rev = b.services.reduce(
          (sum: number, bs: BookingWithServices["services"][number]) => sum + (bs.service?.price ?? 0),
          0
        );
        p.revenue += rev;
      } else if (b.status === "CANCELED") {
        p.canceled += 1;
      }
    }

    const series = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json(series);
  } catch (e) {
    console.error("GET /api/admin/reports/series FAILED:", e);
    return NextResponse.json({ error: "Error while loading series" }, { status: 500 });
  }
}
