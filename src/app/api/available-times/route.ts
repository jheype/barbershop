import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const allTimes = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  const bookings = await prisma.booking.findMany({
    where: {
      serviceId,
      date: {
        gte: new Date(date),
        lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
      },
    },
  });

  const bookedTimes = bookings.map((b : { date: Date }) =>
    b.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

  const availableTimes = allTimes.filter(
    (time) => !bookedTimes.includes(time)
  );

  return NextResponse.json(availableTimes ?? []);
}
