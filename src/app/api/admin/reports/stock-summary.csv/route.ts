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

  const moves = await prisma.stockMove.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      productId: true,
      kind: true,
      qty: true,
      product: { select: { name: true, sku: true, unit: true } },
    },
  });

  const map = new Map<string, { name: string; sku?: string | null; unit?: string | null; inQty: number; outQty: number; adjustQty: number }>();
  for (const m of moves) {
    const key = m.productId;
    if (!map.has(key)) map.set(key, { name: m.product?.name || "(product)", sku: m.product?.sku ?? null, unit: m.product?.unit ?? null, inQty: 0, outQty: 0, adjustQty: 0 });
    const agg = map.get(key)!;
    if (m.kind === "IN") agg.inQty += m.qty;
    else if (m.kind === "OUT") agg.outQty += m.qty;
    else if (m.kind === "ADJUST") agg.adjustQty += m.qty;
  }

  const rows = [
    ["product", "sku", "un", "inflows", "outflows", "adjustments", "net_balance"],
    ...Array.from(map.values()).map(v => [
      v.name.replaceAll('"', '""'),
      v.sku ?? "",
      v.unit ?? "",
      String(v.inQty),
      String(v.outQty),
      String(v.adjustQty),
      String(v.inQty - v.outQty + v.adjustQty),
    ]),
  ];

  const csv = rows.map(cols => cols.map(c => `"${c}"`).join(",")).join("\n");
  const enc = new TextEncoder().encode(csv);
  return new Response(enc, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-summary.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
