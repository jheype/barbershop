import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, photo } = body;

        if (!name || !photo) {
            return NextResponse.json({ error: "Name and photo are required."}, { status: 400 });
        }

        const barber = await prisma.barber.create({
            data: { name, photo },
        });

        return NextResponse.json(barber);
    } catch (error) {
        console.error("Erro ao criar barbeiro:", error);
        return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
}