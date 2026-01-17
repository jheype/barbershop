import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type BookingWhere = {
  date?: { gte?: Date; lt?: Date };
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  try {
    const where: BookingWhere = {};

    if (date) {
      const dayStart = new Date(`${date}T00:00:00`);
      if (Number.isNaN(dayStart.getTime())) {
        return NextResponse.json({ error: "Parameter 'date' invalid" }, { status: 400 });
      }
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.date = { gte: dayStart, lt: dayEnd };
    }

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
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code ?? null : null;
    console.error("GET /api/admin/bookings FAILED:", e);
    return NextResponse.json({ error: "Error while loading agendamentos.", detail, code }, { status: 500 });
  }
}
