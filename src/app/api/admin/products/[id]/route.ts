import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const item = await prisma.product.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Error while loading product" }, { status: 500 });
  }
}

interface ProductUpdateInput {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  active?: boolean;
  costCents?: number | null;
  priceCents?: number | null;
}

type ProductUpdateData = {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  active?: boolean;
  costCents?: number | null;
  priceCents?: number | null;
  updatedAt?: Date;
};

function toInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

function toNonNegIntOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const n = toInt(v);
  if (n === null) return null;
  if (n < 0) return null;
  return n;
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: ProductUpdateInput = await req.json().catch(() => ({} as ProductUpdateInput));

  const data: ProductUpdateData = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.sku !== undefined) data.sku = body.sku == null ? null : String(body.sku).trim() || null;
  if (body.unit !== undefined) data.unit = body.unit == null ? null : String(body.unit).trim() || null;
  if (typeof body.active === "boolean") data.active = body.active;

  if (body.costCents !== undefined) {
    const v = toNonNegIntOrNull(body.costCents);
    if (v !== null && v > 1_000_000_00) return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
    data.costCents = v;
  }

  if (body.priceCents !== undefined) {
    const v = toNonNegIntOrNull(body.priceCents);
    if (v !== null && v > 1_000_000_00) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    data.priceCents = v;
  }

  data.updatedAt = new Date();

  try {
    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error while  atualizar product" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const used = await prisma.saleItem.count({ where: { productId: id } }).catch(() => 0);
    if (used > 0) {
      return NextResponse.json(
        { error: "Este product has already been usado em vendas/consumos and cannot be deleted." },
        { status: 409 }
      );
    }

    await prisma.serviceProduct.deleteMany({ where: { productId: id } });
    await prisma.stockMove.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error while  deletar product" }, { status: 500 });
  }
}
