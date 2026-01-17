import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function isServiceNote(note: string | null | undefined) {
  const n = (note || "").toLowerCase();
  return n.startsWith("booking:") || n.startsWith("cycle:");
}

function isSaleNote(note: string | null | undefined) {
  const n = (note || "").toLowerCase();
  return n.startsWith("sale:");
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days") || 90);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 7), 365) : 90;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, costCents: true, priceCents: true, stockQty: true, active: true },
    });
    const pById = new Map(products.map((p) => [p.id, p]));

    const moves = await prisma.stockMove.findMany({
      where: { kind: "OUT", createdAt: { gte: from } },
      select: { productId: true, qty: true, note: true, createdAt: true },
    });

    const byProduct: Record<
      string,
      { serviceQty: number; saleQty: number; manualQty: number; serviceCostCents: number; manualCostCents: number }
    > = {};

    for (const m of moves) {
      const p = pById.get(m.productId);
      if (!p) continue;
      const qty = Number(m.qty) || 0;
      if (qty <= 0) continue;

      if (!byProduct[p.id]) byProduct[p.id] = { serviceQty: 0, saleQty: 0, manualQty: 0, serviceCostCents: 0, manualCostCents: 0 };

      const isService = isServiceNote(m.note);
      const isSale = isSaleNote(m.note);

      if (isService) {
        byProduct[p.id].serviceQty += qty;
        if (typeof p.costCents === "number") byProduct[p.id].serviceCostCents += Math.round(qty * p.costCents);
      } else if (isSale) {
        byProduct[p.id].saleQty += qty;
      } else {
        byProduct[p.id].manualQty += qty;
        if (typeof p.costCents === "number") byProduct[p.id].manualCostCents += Math.round(qty * p.costCents);
      }
    }

    const rows = products.map((p) => {
      const r = byProduct[p.id] || { serviceQty: 0, saleQty: 0, manualQty: 0, serviceCostCents: 0, manualCostCents: 0 };
      return {
        id: p.id,
        name: p.name,
        stockQty: p.stockQty,
        costCents: p.costCents ?? null,
        priceCents: p.priceCents ?? null,
        active: p.active,
        ...r,
      };
    });

    const topUsedService = [...rows].sort((a, b) => b.serviceQty - a.serviceQty).slice(0, 10);
    const topCostService = [...rows].sort((a, b) => b.serviceCostCents - a.serviceCostCents).slice(0, 10);
    const topWasteCost = [...rows].sort((a, b) => b.manualCostCents - a.manualCostCents).slice(0, 10);

    return NextResponse.json({
      range: { days, from: from.toISOString() },
      topUsedService,
      topCostService,
      topWasteCost,
    });
  } catch (e) {
    console.error("GET /api/admin/products/metrics FAILED:", e);
    return NextResponse.json({ error: "Error while loading metrics." }, { status: 500 });
  }
}
