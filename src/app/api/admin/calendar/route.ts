import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";

type BookingWhere = {
  date?: { gte?: Date; lt?: Date };
  barberId?: string;
  services?: { some: { serviceId?: string } };
  status?: BookingStatus | { in: BookingStatus[] };
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");
    const barberId = searchParams.get("barberId") || undefined;
    const serviceId = searchParams.get("serviceId") || undefined;
    const statusParam = searchParams.get("status") || undefined;

    if (!startStr || !endStr) {
      return NextResponse.json({ error: "start and end are required (YYYY-MM-DD)" }, { status: 400 });
    }

    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);

    const where: BookingWhere = { date: { gte: start, lt: end } };
    if (barberId) where.barberId = barberId;
    if (serviceId) where.services = { some: { serviceId } };

    if (statusParam) {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => ["SCHEDULED", "CONFIRMED", "DONE", "CANCELED"].includes(s)) as BookingStatus[];
      if (statuses.length === 1) where.status = statuses[0];
      else if (statuses.length > 1) where.status = { in: statuses };
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { date: "asc" },
      include: { barber: true, services: { include: { service: true } } },
    });

    return NextResponse.json(bookings);
  } catch (e) {
    console.error("GET /api/admin/calendar", e);
    return NextResponse.json({ error: "Error while loading" }, { status: 500 });
  }
}
