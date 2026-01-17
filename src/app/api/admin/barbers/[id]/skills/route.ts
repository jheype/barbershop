import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type SkillsPutBody = { serviceIds?: unknown };

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const rows: { serviceId: string }[] = await prisma.barberService.findMany({
      where: { barberId: id },
      select: { serviceId: true },
      orderBy: { serviceId: "asc" },
    });
    const ids = rows.map((r) => r.serviceId);
    return NextResponse.json(ids);
  } catch (e) {
    console.error("GET /api/admin/barbers/[id]/skills FAILED:", e);
    return NextResponse.json(
      { error: "Error while loading skills" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body: SkillsPutBody = await req.json().catch(() => ({} as SkillsPutBody));
  const rawList = Array.isArray(body?.serviceIds) ? body.serviceIds : [];
  const serviceIds: string[] = rawList
    .map((v: unknown) => String(v))
    .filter((v: string) => OID.test(v));

  try {
    const barber = await prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }

    if (serviceIds.length) {
      const count = await prisma.service.count({
        where: { id: { in: serviceIds } },
      });
      if (count !== serviceIds.length) {
        return NextResponse.json(
          { error: "One or more services are invalid" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction([
      prisma.barberService.deleteMany({ where: { barberId: id } }),
      ...(serviceIds.length
        ? [
            prisma.barberService.createMany({
              data: serviceIds.map((sid) => ({ barberId: id, serviceId: sid })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, count: serviceIds.length });
  } catch (e) {
    console.error("PUT /api/admin/barbers/[id]/skills FAILED:", e);
    return NextResponse.json(
      { error: "Error while saving skills" },
      { status: 500 }
    );
  }
}
