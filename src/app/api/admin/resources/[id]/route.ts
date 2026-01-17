import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const item = await prisma.resource.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Recurso not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Error while loading recurso" }, { status: 500 });
  }
}

interface ResourcePatch {
  name?: string;
  dailyCapacity?: number;
  active?: boolean;
}

type ResourceUpdateData = {
  name?: string;
  dailyCapacity?: number;
  active?: boolean;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: ResourcePatch = await req.json().catch(() => ({} as ResourcePatch));

  const data: ResourceUpdateData = {};

  if (typeof body.name !== "undefined") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }

  if (typeof body.dailyCapacity !== "undefined") {
    const dailyCapacity = Number(body.dailyCapacity);
    if (Number.isNaN(dailyCapacity) || dailyCapacity < 0) {
      return NextResponse.json({ error: "Capacidade daily invalid" }, { status: 400 });
    }
    data.dailyCapacity = dailyCapacity;
  }

  if (typeof body.active !== "undefined") {
    data.active = Boolean(body.active);
  }

  try {
    const updated = await prisma.resource.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error while  atualizar recurso" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    await prisma.serviceResource.deleteMany({ where: { resourceId: id } });
    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error while  deletar recurso" }, { status: 500 });
  }
}
