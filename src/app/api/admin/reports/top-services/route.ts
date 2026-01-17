import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function parseRange(url: URL) {
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  let from: Date;
  let to: Date;

  if (fromStr && toStr) {
    from = new Date(`${fromStr}T00:00:00`);
    to = new Date(`${toStr}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("invalid-range");
    }
  } else {
    to = new Date();
    to.setHours(0, 0, 0, 0);
    from = new Date(to);
    from.setDate(from.getDate() - 29);
  }

  const toEnd = new Date(to);
  toEnd.setDate(toEnd.getDate() + 1);

  return { from, toEnd };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const { from, toEnd } = parseRange(url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 10)));

    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: "CANCELED" },
        date: { gte: from, lt: toEnd },
      },
      include: { services: { include: { service: true } } },
    });

    const map = new Map<
      string,
      { id: string; name: string; count: number; revenue: number; avgPrice: number }
    >();

    for (const b of bookings) {
      for (const bs of b.services) {
        const s = bs.service;
        if (!s) continue;
        const key = s.id;
        const prev = map.get(key) || {
          id: s.id,
          name: s.name,
          count: 0,
          revenue: 0,
          avgPrice: 0,
        };
        prev.count += 1;
        prev.revenue += s.price ?? 0;
        map.set(key, prev);
      }
    }

    const arr = Array.from(map.values())
      .map((it) => ({ ...it, avgPrice: it.count ? Number((it.revenue / it.count).toFixed(2)) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((it) => ({ ...it, revenue: Number(it.revenue.toFixed(2)) }));

    return NextResponse.json({ items: arr, from: url.searchParams.get("from"), to: url.searchParams.get("to") });
  } catch (e) {
    console.error("GET /api/admin/reports/top-services FAILED:", e);
    return NextResponse.json({ error: "Error while  calcular ranking de services" }, { status: 500 });
  }
}
