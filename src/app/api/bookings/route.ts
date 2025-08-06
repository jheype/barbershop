import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    let { serviceId, clientName, date } = await req.json();

    date = decodeURIComponent(date);

    console.log("Recebido no POST /api/bookings", { serviceId, clientName, date });

    if (!serviceId || !clientName || !date) {
        console.error("Dados incompletos");
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        console.error("Data invalida:", date);
        return NextResponse.json({ error: "Data invalida" }, { status: 400 });
    }

    const newBooking = await prisma.booking.create({
      data: {
        serviceId, 
        clientName,
        date: parsedDate, 
      },
    });

    console.log("Agendamento criado:", newBooking);
    return NextResponse.json(newBooking);
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    return NextResponse.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
