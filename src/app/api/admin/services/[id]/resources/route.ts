import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type IncomingResource = { resourceId?: string; unitsRequired?: number };
type PutBody = { items?: IncomingResource[] };

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const links = await prisma.serviceResource.findMany({
      where: { serviceId: id },
      orderBy: { id: "asc" },
      include: {
        resource: { select: { id: true, name: true, dailyCapacity: true, active: true } },
      },
    });

    const items = links.map((l: typeof links[number]) => ({
      id: l.id,
      resourceId: l.resourceId,
      unitsRequired: l.unitsRequired,
      resource: l.resource
        ? {
            id: l.resource.id,
            name: l.resource.name,
            dailyCapacity: l.resource.dailyCapacity,
            active: l.resource.active,
          }
        : null,
    }));

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/services/[id]/resources FAILED:", e);
    return NextResponse.json(
      { error: "Error while loading recursos do service" },
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

  const body: PutBody = await req.json().catch(() => ({} as PutBody));
  const list: IncomingResource[] = Array.isArray(body?.items) ? body.items : [];

  const data = list
    .map((it) => ({
      resourceId: typeof it.resourceId === "string" ? it.resourceId : "",
      unitsRequired: Number(it.unitsRequired ?? 0),
    }))
    .filter((it) => OID.test(it.resourceId) && it.unitsRequired > 0);

  try {
    await prisma.$transaction([
      prisma.serviceResource.deleteMany({ where: { serviceId: id } }),
      ...(data.length
        ? [
            prisma.serviceResource.createMany({
              data: data.map((d) => ({
                serviceId: id,
                resourceId: d.resourceId,
                unitsRequired: d.unitsRequired,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, count: data.length });
  } catch (e) {
    console.error("PUT /api/admin/services/[id]/resources FAILED:", e);
    return NextResponse.json(
      { error: "Error while saving recursos do service" },
      { status: 500 }
    );
  }
}
