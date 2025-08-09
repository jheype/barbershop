import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isObjectId(id: string) {
    return /^[a-f\d]{24}$/i.test(id);
}

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    if (!isObjectId(id)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const barber = await prisma.barber.findUnique({
        where: { id },
    });

    if (!barber) {
        return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }

    return NextResponse.json(barber);
}