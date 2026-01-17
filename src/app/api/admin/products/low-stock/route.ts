import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const th = Number(url.searchParams.get("threshold") || 5);
  const threshold = Number.isFinite(th) && th >= 0 ? th : 5;

  try {
    const items = await prisma.product.findMany({
      where: {
        active: true,
        stockQty: { lt: threshold },
      },
      orderBy: { stockQty: "asc" },
      select: { id: true, name: true, sku: true, stockQty: true, unit: true },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/products/low-stock FAILED:", e);
    return NextResponse.json({ error: "Error while loading products com baixo estoque" }, { status: 500 });
  }
}
