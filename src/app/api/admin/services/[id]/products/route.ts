import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type IncomingItem = { productId?: string; quantityPerService?: number };
type PutBody = { items?: IncomingItem[] };

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const links = await prisma.serviceProduct.findMany({
      where: { serviceId: id },
      orderBy: { id: "asc" },
      include: {
        product: {
          select: { id: true, name: true, unit: true, stockQty: true, active: true },
        },
      },
    });

    const items = links.map((l: typeof links[number]) => ({
      id: l.id,
      productId: l.productId,
      quantityPerService: l.quantityPerService,
      product: l.product
        ? {
            id: l.product.id,
            name: l.product.name,
            unit: l.product.unit,
            stockQty: l.product.stockQty,
            active: l.product.active,
          }
        : null,
    }));

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/services/[id]/products FAILED:", e);
    return NextResponse.json(
      { error: "Error while loading products do service" },
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
  const listRaw: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  const normalized = listRaw
    .map((it) => ({
      productId: typeof it.productId === "string" ? it.productId : "",
      quantityPerService: Number(it.quantityPerService ?? 0),
    }))
    .filter((it) => OID.test(it.productId) && it.quantityPerService > 0);

  try {
    await prisma.$transaction([
      prisma.serviceProduct.deleteMany({ where: { serviceId: id } }),
      ...(normalized.length
        ? [
            prisma.serviceProduct.createMany({
              data: normalized.map((entry) => ({
                serviceId: id,
                productId: entry.productId,
                quantityPerService: entry.quantityPerService,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, count: normalized.length });
  } catch (e) {
    console.error("PUT /api/admin/services/[id]/products FAILED:", e);
    return NextResponse.json(
      { error: "Error while saving products do service" },
      { status: 500 }
    );
  }
}
