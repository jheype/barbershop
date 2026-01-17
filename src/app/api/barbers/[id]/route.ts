import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const barber = await prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }
    return NextResponse.json(barber);
  } catch (e) {
    console.error("GET /api/barbers/[id] FAILED:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
