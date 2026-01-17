import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type ServiceLinksInput = {
  products?: { productId: string; qtyPerSvc: number }[];
  resources?: { resourceId: string; unitsReq: number }[];
  barbers?: string[];
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: ServiceLinksInput = await req.json().catch(() => ({} as ServiceLinksInput));

  const products = Array.isArray(body.products) ? body.products : [];
  const resources = Array.isArray(body.resources) ? body.resources : [];
  const barbers = Array.isArray(body.barbers) ? body.barbers : [];

  try {
    await prisma.$transaction([
      prisma.serviceProduct.deleteMany({ where: { serviceId: id } }),
      prisma.serviceResource.deleteMany({ where: { serviceId: id } }),
      prisma.barberService.deleteMany({ where: { serviceId: id } }),
    ]);


    const productRows = products
      .filter((p) => OID.test(p.productId) && Number(p.qtyPerSvc) > 0)
      .map((p) => ({
        serviceId: id,
        productId: p.productId,
        quantityPerService: Number(p.qtyPerSvc),
      }));

    if (productRows.length) {
      await prisma.serviceProduct.createMany({ data: productRows });
    }

    const resourceRows = resources
      .filter((r) => OID.test(r.resourceId) && Number(r.unitsReq) > 0)
      .map((r) => ({
        serviceId: id,
        resourceId: r.resourceId,
        unitsReq: Number(r.unitsReq),
      }));

    if (resourceRows.length) {
      await prisma.serviceResource.createMany({ data: resourceRows });
    }

    const barberRows = barbers.filter((bid) => OID.test(bid)).map((bid) => ({
      serviceId: id,
      barberId: bid,
    }));

    if (barberRows.length) {
      await prisma.barberService.createMany({ data: barberRows });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/services/[id]/links FAILED:", e);
    return NextResponse.json({ error: "Error while  atualizar links" }, { status: 500 });
  }
}
