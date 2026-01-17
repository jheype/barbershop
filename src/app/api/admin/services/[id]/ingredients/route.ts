import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type IngredientInput = {
  productId?: string;
  quantityPerService?: number;
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const rows = await prisma.serviceProduct.findMany({
      where: { serviceId: id },
      include: { product: true },
    });

    const items = rows.map((r: typeof rows[number]) => ({
      productId: r.productId,
      productName: r.product?.name ?? "",
      unit: r.product?.unit ?? null,
      quantityPerService: r.quantityPerService,
    }));

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/services/[id]/ingredients FAILED:", e);
    return NextResponse.json({ error: "Error while loading insumos" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: IngredientInput = await req.json().catch(() => ({} as IngredientInput));
  const productId = String(body.productId || "");
  const qty = Number(body.quantityPerService || 0);

  if (!OID.test(productId)) {
    return NextResponse.json({ error: "Product invalid" }, { status: 400 });
  }
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: "Quantidade must ser > 0" }, { status: 400 });
  }

  try {
    const exists = await prisma.serviceProduct.findFirst({
      where: { serviceId: id, productId },
    });

    if (exists) {
      await prisma.serviceProduct.update({
        where: { id: exists.id },
        data: { quantityPerService: qty },
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    await prisma.serviceProduct.create({
      data: { serviceId: id, productId, quantityPerService: qty },
    });
    return NextResponse.json({ ok: true, created: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/services/[id]/ingredients FAILED:", e);
    return NextResponse.json({ error: "Error while saving insumo" }, { status: 500 });
  }
}
