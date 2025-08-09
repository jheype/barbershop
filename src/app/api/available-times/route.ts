import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const barberId = searchParams.get("barber");
  const servicesParam = searchParams.get("services");

  if (!date || !barberId || !servicesParam) {
    return NextResponse.json({ error: "Parametros ausentes."}, { status: 400 });
  }

  const rawServiceIds = servicesParam.split(",");

  const serviceIds = rawServiceIds.filter(id => /^[a-f\d]{24}$/i.test(id));

  if (serviceIds.length === 0) {
    return NextResponse.json({ error: "Nenhum ID de servico valido"}, { status: 400 });
  }

  try {
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
    });

    const totalDuration = services.reduce((acc, service) => acc + service.duration, 0);

    const startHour = 7;
    const endHour = 23;
    const availableTimes: string[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        availableTimes.push(time);
      }
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const bookings = await prisma.booking.findMany({
      where: {
        barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    function hasConflict(candidate: string) {
      const [h, m] = candidate.split(":").map(Number);
      const start = new Date(`${date}T${candidate}`);
      const end = new Date(start.getTime() + totalDuration * 60 * 1000);

      for (const booking of bookings) {
        const bookingStart = new Date(booking.date);
        const totalBookingDuration = booking.services.reduce(
          (acc, bs) => acc + (bs.service?.duration || 0),
          0
        );
        const bookingEnd = new Date(bookingStart.getTime() + totalBookingDuration * 60 * 1000);

        if (
          (start >= bookingStart && start < bookingEnd) ||
          (end > bookingStart && end <= bookingEnd) ||
          (start <= bookingStart && end >= bookingEnd)
        ) {
          return true;
        }
      }

      return false;
    }

    const freeTimes = availableTimes.filter(time => !hasConflict(time));

    return NextResponse.json(freeTimes);
  } catch (error) {
    console.error("Erro ao buscar horarios:", error);
    return NextResponse.json({ error: "Erro interno"}, { status: 500 });
  }
}