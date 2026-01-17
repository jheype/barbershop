import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

type PaymentLite = { netTotal: number };
type BookingServiceLite = { service: { price: number } | null };

type BookingLite = {
  id: string;
  clientName: string;
  date: Date;
  payments: PaymentLite[];
  services: BookingServiceLite[];
};

function monthRangeUTC(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!id || !OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const now = new Date();
  const { start, end } = monthRangeUTC(now);

  try {
    const barber = await prisma.barber.findUnique({ where: { id }, select: { id: true } });
    if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });

    const bookingsRaw = await prisma.booking.findMany({
      where: {
        barberId: id,
        status: "DONE",
        date: { gte: start, lt: end },
      },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        clientName: true,
        date: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { netTotal: true },
        },
        services: {
          select: {
            service: { select: { price: true } },
          },
        },
      },
    });

    const bookings = bookingsRaw as BookingLite[];
    const count = bookings.length;

    let revenue = 0;

    for (const b of bookings) {
      const paid = b.payments[0]?.netTotal;
      if (typeof paid === "number" && Number.isFinite(paid)) {
        revenue += paid;
        continue;
      }

      const sum = (b.services || []).reduce((acc, x) => {
        const p = x.service?.price;
        return typeof p === "number" && Number.isFinite(p) ? acc + p : acc;
      }, 0);

      revenue += sum;
    }

    const avgTicket = count > 0 ? revenue / count : 0;

    const recent = bookings.slice(0, 8).map((b) => ({
      id: b.id,
      clientName: b.clientName,
      date: b.date.toISOString(),
      netTotal: b.payments[0]?.netTotal ?? null,
    }));

    const periodLabel = `Current month (${start.toLocaleDateString("en-GB")} — ${new Date(
      end.getTime() - 1
    ).toLocaleDateString("en-GB")})`;

    return NextResponse.json({ periodLabel, count, revenue, avgTicket, recent });
  } catch (e) {
    console.error("GET /api/admin/barbers/[id]/stats FAILED:", e);
    return NextResponse.json({ error: "Data unavailable" }, { status: 500 });
  }
}