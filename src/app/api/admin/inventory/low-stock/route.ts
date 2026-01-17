import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const onlyActive = (url.searchParams.get("active") || "1") === "1";

  try {
    // Define o tipo baseado no select
    type ProductItem = {
      id: string;
      name: string;
      sku: string | null;
      unit: string | null;
      stockQty: number;
      lowStockThreshold: number | null;
      active: boolean;
    };

    const items: ProductItem[] = await prisma.product.findMany({
      where: {
        ...(onlyActive ? { active: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stockQty: true,
        lowStockThreshold: true,
        active: true,
      },
    });

    const low = items.filter((p: ProductItem) => {
      const threshold = Number(p.lowStockThreshold || 0);
      if (threshold > 0) return p.stockQty <= threshold;
      return p.stockQty <= 0;
    });

    return NextResponse.json(low);
  } catch (e) {
    console.error("GET /api/admin/inventory/low-stock FAILED:", e);
    return NextResponse.json(
      { error: "Error while loading alertas de estoque." },
      { status: 500 }
    );
  }
}
