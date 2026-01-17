import type { Prisma } from "@prisma/client";

const OID = /^[a-fA-F0-9]{24}$/;

export type SaleItemInput = {
  productId: string;
  qty: number;
};

export type CreateSaleInput = {
  clientId?: string | null;
  bookingId?: string | null;
  note?: string | null;
  items: SaleItemInput[];
};

function toQty(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function cleanNote(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (s.includes("<") || s.includes(">")) return null;
  return s.slice(0, 240);
}

export function parseSaleItems(v: unknown): SaleItemInput[] | null {
  if (!Array.isArray(v)) return null;
  const out: SaleItemInput[] = [];
  for (const it of v) {
    if (!it || typeof it !== "object") return null;
    const pid = String((it as Record<string, unknown>).productId || "").trim();
    const qty = toQty((it as Record<string, unknown>).qty);
    if (!OID.test(pid) || qty === null) return null;
    out.push({ productId: pid, qty });
  }
  if (out.length === 0) return [];
  const byId = new Map<string, number>();
  for (const it of out) byId.set(it.productId, (byId.get(it.productId) || 0) + it.qty);
  return Array.from(byId.entries()).map(([productId, qty]) => ({ productId, qty }));
}

export async function createSaleTx(tx: Prisma.TransactionClient, input: CreateSaleInput) {
  const items = input.items;
  if (!items.length) throw new Error("EMPTY");

  const clientId = input.clientId && OID.test(input.clientId) ? input.clientId : null;
  const bookingId = input.bookingId && OID.test(input.bookingId) ? input.bookingId : null;
  const note = cleanNote(input.note);

  if (bookingId) {
    const already = await tx.sale.count({ where: { bookingId } });
    if (already > 0) throw new Error("DUP_BOOKING");
  }

  const ids = items.map((i) => i.productId);

  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, active: true, stockQty: true, costCents: true, priceCents: true },
  });

  if (products.length !== ids.length) throw new Error("MISSING");
  const pById = new Map(products.map((p) => [p.id, p]));

  for (const it of items) {
    const p = pById.get(it.productId);
    if (!p) throw new Error("MISSING");
    if (!p.active) throw new Error("INACTIVE");
    if (p.stockQty - it.qty < 0) throw new Error("NEGATIVE");
  }

  let totalCents = 0;
  const toCreateItems: Array<{
    productId: string;
    productName: string;
    qty: number;
    unitPriceCents: number | null;
    unitCostCents: number | null;
  }> = [];

  for (const it of items) {
    const p = pById.get(it.productId)!;
    const unitPriceCents = typeof p.priceCents === "number" ? p.priceCents : null;
    const unitCostCents = typeof p.costCents === "number" ? p.costCents : null;
    if (unitPriceCents !== null) totalCents += Math.round(it.qty * unitPriceCents);
    toCreateItems.push({
      productId: p.id,
      productName: p.name,
      qty: it.qty,
      unitPriceCents,
      unitCostCents,
    });
  }

  const sale = await tx.sale.create({
    data: {
      clientId: clientId ?? undefined,
      bookingId: bookingId ?? undefined,
      totalCents,
      note: note ?? undefined,
    },
    select: { id: true },
  });

  await tx.saleItem.createMany({
    data: toCreateItems.map((it) => ({ ...it, saleId: sale.id })),
  });

  await tx.stockMove.createMany({
    data: toCreateItems.map((it) => ({
      productId: it.productId,
      kind: "OUT" as const,
      qty: it.qty,
      note: `sale:${sale.id}`,
      createdAt: new Date(),
    })),
  });

  for (const it of toCreateItems) {
    await tx.product.update({
      where: { id: it.productId },
      data: { stockQty: { decrement: it.qty }, updatedAt: new Date() },
    });
  }

  return sale.id;
}
