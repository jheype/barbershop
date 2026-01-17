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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); 

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

    const rangeStart = startOfDay(fromDay);
    const rangeEnd = endOfDay(toDay);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: "CANCELED" },
        date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { date: true },
    });

    const matrix: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: HOURS.length }, () => 0)
    );

    for (const b of bookings) {
      const d = new Date(b.date);
      const weekday = d.getDay(); 
      const hour = d.getHours();
      const col = HOURS.indexOf(hour);
      if (col >= 0) matrix[weekday][col] += 1;
    }

    return NextResponse.json({
      hours: HOURS,
      rows: [
        { weekday: 0, counts: matrix[0] }, // Domingo
        { weekday: 1, counts: matrix[1] }, // Segunda
        { weekday: 2, counts: matrix[2] }, // Tuesday
        { weekday: 3, counts: matrix[3] }, // Quarta
        { weekday: 4, counts: matrix[4] }, // Quinta
        { weekday: 5, counts: matrix[5] }, // Sexta
        { weekday: 6, counts: matrix[6] }, // Saturday
      ],
      total: bookings.length,
    });
  } catch (e) {
    console.error("GET /api/admin/reports/heatmap FAILED:", e);
    return NextResponse.json({ hours: [], rows: [], total: 0 }, { status: 200 });
  }
}
