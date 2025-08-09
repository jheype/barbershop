import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

// PUT /api/admin/services/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!isObjectId(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    const data: any = {};

    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.duration === "number") data.duration = body.duration;
    if (typeof body.category === "string" || body.category === null) data.category = body.category ?? null;
    if (typeof body.description === "string" || body.description === null) data.description = body.description ?? null;
    if (typeof body.active === "boolean") data.active = body.active;

    const updated = await prisma.service.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar serviço" }, { status: 500 });
  }
}

// DELETE /api/admin/services/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!isObjectId(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao deletar serviço" }, { status: 500 });
  }
}
