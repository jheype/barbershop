import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let where: any = {};
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    where = { date: { gte: start, lte: end } };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      barber: true,
      services: { include: { service: true } }, // 👈 ESSENCIAL
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(bookings ?? []);
}
