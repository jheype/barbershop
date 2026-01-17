import { prisma } from "@/lib/prisma";

function noteOut(id: string) {
  return `booking:${id}`;
}
function noteIn(id: string) {
  return `booking:${id}:revert`;
}

type ConsumptionItem = {
  productId: string;
  qty: number;
};

type StockError = Error & {
  code?: "INSUFFICIENT_STOCK";
  details?: {
    productId: string;
    productName: string;
    need: number;
    have: number;
  };
};

type ProductRow = {
  id: string;
  stockQty: number | null;
  name: string | null;
  unit: string | null;
};

type TxClient = Omit<
  typeof prisma,
  "$on" | "$connect" | "$disconnect" | "$use" | "$extends" | "$transaction"
>;

async function getBookingServicesWithProducts(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      services: {
        include: {
          service: {
            include: {
              products: true, 
            },
          },
        },
      },
    },
  });
}

export async function computeBookingConsumption(
  bookingId: string
): Promise<ConsumptionItem[]> {
  const booking = await getBookingServicesWithProducts(bookingId);
  if (!booking) return [];

  const map = new Map<string, number>();
  for (const bs of booking.services) {
    for (const sp of bs.service?.products || []) {
      const current = map.get(sp.productId) || 0;
      map.set(sp.productId, current + (sp.quantityPerService || 0));
    }
  }
  return Array.from(map.entries()).map(([productId, qty]) => ({
    productId,
    qty,
  }));
}

export async function alreadyConsumed(bookingId: string): Promise<boolean> {
  const count = await prisma.stockMove.count({
    where: { kind: "OUT", note: noteOut(bookingId) },
  });
  return count > 0;
}

export async function alreadyReverted(bookingId: string): Promise<boolean> {
  const count = await prisma.stockMove.count({
    where: { kind: "IN", note: noteIn(bookingId) },
  });
  return count > 0;
}

export async function consumeForBooking(bookingId: string) {
  const done = await alreadyConsumed(bookingId);
  if (done) return;

  const items = await computeBookingConsumption(bookingId);
  if (items.length === 0) return;

  const products = (await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
    select: { id: true, stockQty: true, name: true, unit: true },
  })) as ProductRow[];

  const qtyMap: Map<string, number> = new Map(
    products.map((p): [string, number] => [p.id, Number(p.stockQty ?? 0)])
  );

  for (const it of items) {
    const have = qtyMap.get(it.productId) ?? 0;
    if (have < it.qty) {
      const p = products.find((x) => x.id === it.productId);
      const err: StockError = new Error("Inventory insuficiente");
      err.code = "INSUFFICIENT_STOCK";
      err.details = {
        productId: it.productId,
        productName: p?.name || it.productId,
        need: it.qty,
        have,
      };
      throw err;
    }
  }

  await prisma.$transaction(async (tx: TxClient) => {
    for (const it of items) {
      if (it.qty <= 0) continue;
      await tx.stockMove.create({
        data: {
          productId: it.productId,
          kind: "OUT",
          qty: it.qty,
          note: noteOut(bookingId),
        },
      });
    }
    for (const it of items) {
      if (it.qty <= 0) continue;
      await tx.product.update({
        where: { id: it.productId },
        data: { stockQty: { decrement: it.qty } },
      });
    }
  });
}

export async function revertConsumptionForBooking(bookingId: string) {
  const consumed = await alreadyConsumed(bookingId);
  if (!consumed) return;
  const reverted = await alreadyReverted(bookingId);
  if (reverted) return;

  const items = await computeBookingConsumption(bookingId);
  if (items.length === 0) return;

  await prisma.$transaction(async (tx: TxClient) => {
    for (const it of items) {
      if (it.qty <= 0) continue;
      await tx.stockMove.create({
        data: {
          productId: it.productId,
          kind: "IN",
          qty: it.qty,
          note: noteIn(bookingId),
        },
      });
    }
    for (const it of items) {
      if (it.qty <= 0) continue;
      await tx.product.update({
        where: { id: it.productId },
        data: { stockQty: { increment: it.qty } },
      });
    }
  });
}
