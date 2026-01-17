import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type BookingWhere = {
  date?: { gte?: Date; lt?: Date };
  barberId?: string;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const barberId = url.searchParams.get("barberId");

  if (!start || !end) {
    return NextResponse.json({ error: "Parameters 'start' e 'end' are required." }, { status: 400 });
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const where: BookingWhere = { date: { gte: startDate, lt: endDate } };
  if (barberId) {
    if (!OID.test(barberId)) return NextResponse.json({ error: "Barber invalid." }, { status: 400 });
    where.barberId = barberId;
  }

  try {
    const items = await prisma.booking.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        barber: true,
        services: { include: { service: true } },
      },
    });
    return NextResponse.json(Array.isArray(items) ? items : []);
  } catch (e) {
    const detail = e instanceof Error ? e.message : null;
    console.error("GET /api/admin/bookings/range FAILED:", e);
    return NextResponse.json({ error: "Error while loading agendamentos.", detail }, { status: 500 });
  }
}
