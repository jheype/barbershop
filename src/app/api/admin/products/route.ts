import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

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

type ProductWhere = {
  active?: boolean;
  OR?: Array<
    | { name: { contains: string; mode: "insensitive" } }
    | { sku: { contains: string; mode: "insensitive" } }
  >;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const active = url.searchParams.get("active");
  const q = (url.searchParams.get("q") || "").trim();

  const where: ProductWhere = {};
  if (active === "1") where.active = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const items = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Error while  listar products" }, { status: 500 });
  }
}

interface ProductInput {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  stockQty?: number;
  active?: boolean;
  costCents?: number | null;
  priceCents?: number | null;
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const body: ProductInput = await req.json().catch(() => ({} as ProductInput));
  const name = String(body?.name || "").trim();
  const sku = body?.sku == null ? null : str(body.sku).trim() || null;
  const unit = body?.unit == null ? null : str(body.unit).trim() || null;
  const stockQty = Number(body?.stockQty ?? 0);
  const active = body?.active === false ? false : true;
  const costCents = toNonNegIntOrNull(body?.costCents);
  const priceCents = toNonNegIntOrNull(body?.priceCents);

  if (!name || Number.isNaN(stockQty) || stockQty < 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  if (sku && sku.length > 64) return NextResponse.json({ error: "SKU invalid" }, { status: 400 });
  if (unit && unit.length > 16) return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  if (costCents !== null && costCents > 1_000_000_00)
    return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
  if (priceCents !== null && priceCents > 1_000_000_00)
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  try {
    const created = await prisma.product.create({
      data: { name, sku, unit, stockQty, active, costCents, priceCents },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error while creating product" }, { status: 500 });
  }
}
