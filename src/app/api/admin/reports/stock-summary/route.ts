import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function range(from?: string | null, to?: string | null) {
  const now = new Date();
  const toD = to ? new Date(to) : now;
  const fromD = from ? new Date(from) : new Date(now.getTime() - 29 * 86400000);
  const start = new Date(fromD); start.setHours(0, 0, 0, 0);
  const end = new Date(toD); end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { start, end } = range(from, to);

  try {
    const moves = await prisma.stockMove.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
      select: {
        productId: true,
        kind: true,
        qty: true,
        product: { select: { id: true, name: true, sku: true, unit: true, active: true } },
      },
    });

    const map = new Map<string, {
      id: string; name: string; sku?: string | null; unit?: string | null; active: boolean;
      inQty: number; outQty: number; adjustQty: number;
    }>();

    for (const m of moves) {
      const key = m.productId;
      if (!map.has(key)) {
        map.set(key, {
          id: m.product?.id || key,
          name: m.product?.name || "(product)",
          sku: m.product?.sku ?? null,
          unit: m.product?.unit ?? null,
          active: !!m.product?.active,
          inQty: 0, outQty: 0, adjustQty: 0,
        });
      }
      const agg = map.get(key)!;
      if (m.kind === "IN") agg.inQty += m.qty;
      else if (m.kind === "OUT") agg.outQty += m.qty;
      else if (m.kind === "ADJUST") agg.adjustQty += m.qty;
    }

    const items = Array.from(map.values())
      .map(it => ({ ...it, netQty: it.inQty - it.outQty + it.adjustQty }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ items, from: start.toISOString(), to: end.toISOString() });
  } catch (e) {
    console.error("GET /api/admin/reports/stock-summary FAILED:", e);
    return NextResponse.json({ error: "Error while  gerar resumo." }, { status: 500 });
  }
}
