import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type ServicePatchInput = {
  name?: string;
  price?: number;
  duration?: number;
  category?: string | null;
  description?: string | null;
  active?: boolean;
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        products: { include: { product: true } },
        resources: { include: { resource: true } },
        barbers: { include: { barber: true } },
      },
    });

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "Error while loading service" }, { status: 500 });
  }
}

type ServiceUpdateData = {
  name?: string;
  price?: number;
  duration?: number;
  category?: string | null;
  description?: string | null;
  active?: boolean;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: ServicePatchInput = await req.json().catch(() => ({} as ServicePatchInput));

  const data: ServiceUpdateData = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }

  if (typeof body.price !== "undefined") {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    data.price = price;
  }

  if (typeof body.duration !== "undefined") {
    const duration = Number(body.duration);
    if (Number.isNaN(duration) || duration <= 0) return NextResponse.json({ error: "Duration invalid" }, { status: 400 });
    data.duration = duration;
  }

  if (typeof body.category !== "undefined") {
    data.category = body.category ?? null;
  }

  if (typeof body.description !== "undefined") {
    data.description = body.description ?? null;
  }

  if (typeof body.active !== "undefined") {
    data.active = Boolean(body.active);
  }

  try {
    const updated = await prisma.service.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error while  atualizar service" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  return PATCH(req, ctx);
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    await prisma.bookingService.deleteMany({ where: { serviceId: id } });
    await prisma.serviceProduct.deleteMany({ where: { serviceId: id } });
    await prisma.serviceResource.deleteMany({ where: { serviceId: id } });
    await prisma.barberService.deleteMany({ where: { serviceId: id } });
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error while  deletar service" }, { status: 500 });
  }
}
