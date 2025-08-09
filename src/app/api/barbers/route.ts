import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const barbers = await prisma.barber.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(barbers);
  } catch (error) {
    console.error("Erro ao buscar barbeiros:", error);
    return NextResponse.json({ error: "Erro ao buscar barbeiros" }, { status: 500 });
  }
}
