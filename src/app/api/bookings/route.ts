import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { clientName, barberId, serviceIds, date, time, dateTime } = body as {
      clientName: string;
      barberId: string;
      serviceIds: string[];
      date?: string;     // "YYYY-MM-DD"
      time?: string;     // "HH:mm"
      dateTime?: string; // opcional
    };

    // validações básicas
    if (!clientName || !barberId || !serviceIds || serviceIds.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    if (!isObjectId(barberId)) {
      return NextResponse.json({ error: "barberId inválido" }, { status: 400 });
    }

    // normaliza data/hora
    let finalISO: string | null = null;
    if (dateTime) {
      finalISO = decodeURIComponent(dateTime);
    } else {
      if (!date || !time) {
        return NextResponse.json({ error: "Informe date e time" }, { status: 400 });
      }
      finalISO = `${date}T${time}`;
    }
    const when = new Date(finalISO);
    if (isNaN(when.getTime())) {
      return NextResponse.json({ error: "Data/Horário inválidos" }, { status: 400 });
    }

    // filtra ids válidos (ObjectId de 24 chars)
    const validServiceIds = (serviceIds || []).filter(isObjectId);
    if (validServiceIds.length === 0) {
      return NextResponse.json({ error: "Nenhum serviceId válido" }, { status: 400 });
    }

    // (opcional) valida se serviços existem
    const servicesCount = await prisma.service.count({
      where: { id: { in: validServiceIds } },
    });
    if (servicesCount !== validServiceIds.length) {
      return NextResponse.json({ error: "Algum serviceId não existe" }, { status: 400 });
    }

    // cria o booking base
    const booking = await prisma.booking.create({
      data: {
        clientName,
        barberId,
        date: when,
      },
    });

    // --- DEDUP manual (Mongo não suporta skipDuplicates) ---
    // busca vínculos já existentes para esse booking
    const already = await prisma.bookingService.findMany({
      where: {
        bookingId: booking.id,
        serviceId: { in: validServiceIds },
      },
      select: { serviceId: true },
    });
    const existing = new Set(already.map(a => a.serviceId));

    // filtra apenas os que ainda não existem
    const toInsert = validServiceIds
      .filter(id => !existing.has(id))
      .map(id => ({ bookingId: booking.id, serviceId: id }));

    if (toInsert.length > 0) {
      await prisma.bookingService.createMany({ data: toInsert });
    }
    // --- fim dedup ---

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
