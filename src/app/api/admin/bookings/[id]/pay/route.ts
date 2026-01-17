import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/security/requireAdmin";
import { createSaleTx, parseSaleItems } from "@/lib/sales";

const OID = /^[a-fA-F0-9]{24}$/;

const PAYMENT_METHODS = ["CASH", "PIX", "CARD_DEBIT", "CARD_CREDIT", "OTHER"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type PayBody = {
  method?: PaymentMethod;
  amountReceived?: number;
  discount?: number;
  surcharge?: number;
  note?: string;
  markDone?: boolean;
  saleItems?: unknown;
};

async function sumProductsForBookingTx(tx: Prisma.TransactionClient, bookingId: string) {
  const bs = await tx.bookingService.findMany({
    where: { bookingId },
    select: {
      service: {
        select: {
          products: {
            select: { productId: true, quantityPerService: true },
          },
        },
      },
    },
  });

  const totals = new Map<string, number>();

  for (const row of bs) {
    const links = row.service?.products ?? [];
    for (const link of links) {
      const q = Number(link.quantityPerService ?? 0);
      if (!Number.isFinite(q) || q <= 0) continue;
      totals.set(link.productId, (totals.get(link.productId) ?? 0) + q);
    }
  }

  return totals;
}

async function consumeProductsCycleTx(tx: Prisma.TransactionClient, bookingId: string) {
  const totals = await sumProductsForBookingTx(tx, bookingId);
  if (totals.size === 0) return;

  const ids = Array.from(totals.keys());
  const ps = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, stockQty: true },
  });

  if (ps.length !== ids.length) throw new Error("PRODUCT_MISSING");

  const stockMap = new Map(ps.map((p) => [p.id, p.stockQty]));
  for (const [pid, qty] of totals.entries()) {
    const cur = stockMap.get(pid);
    if (typeof cur !== "number") throw new Error("PRODUCT_MISSING");
    if (cur - qty < 0) throw new Error("STOCK_NEGATIVE");
  }

  const ts = Date.now();
  const note = `cycle:${bookingId}:DONE:${ts}`;
  const createdAt = new Date();

  const moves = Array.from(totals.entries()).map(([productId, qty]) => ({
    productId,
    kind: "OUT" as const,
    qty,
    note,
    createdAt,
  }));

  await tx.stockMove.createMany({ data: moves });

  for (const [productId, qty] of totals.entries()) {
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: { decrement: qty }, updatedAt: new Date() },
    });
  }
}

async function saleTotalForItemsTx(tx: Prisma.TransactionClient, items: Array<{ productId: string; qty: number }>) {
  if (!items.length) return { total: 0, label: "" };

  const ids = items.map((i) => i.productId);
  const ps = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, priceCents: true },
  });

  const byId = new Map(ps.map((p) => [p.id, p] as const));
  let totalCents = 0;
  const parts: string[] = [];

  for (const it of items) {
    const p = byId.get(it.productId);
    const nm = p?.name || "Product";
    parts.push(`${nm} x${it.qty}`);
    if (typeof p?.priceCents === "number") totalCents += Math.round(it.qty * p.priceCents);
  }

  return { total: totalCents / 100, label: parts.join(", ") };
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body: PayBody = await req.json().catch(() => ({} as PayBody));

    const method = (body.method ?? "CASH") as PaymentMethod;
    if (!PAYMENT_METHODS.includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const amountReceived = Number(body.amountReceived ?? 0);
    const discount = Number(body.discount ?? 0);
    const surcharge = Number(body.surcharge ?? 0);

    const noteRaw = typeof body.note === "string" ? body.note.trim() : undefined;
    if (noteRaw && (noteRaw.includes("<") || noteRaw.includes(">"))) {
      return NextResponse.json({ error: "Note must be plain text." }, { status: 400 });
    }
    const note = noteRaw ? noteRaw.slice(0, 160) : undefined;

    const markDone = Boolean(body.markDone ?? true);

    const saleItems = body.saleItems === undefined ? [] : parseSaleItems(body.saleItems);
    if (saleItems === null) {
      return NextResponse.json({ error: "Invalid consumption items" }, { status: 400 });
    }

    if (discount < 0 || surcharge < 0) {
      return NextResponse.json({ error: "Invalid discount/surcharge" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { services: { include: { service: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CANCELED") {
      return NextResponse.json(
        { error: "Booking canceled cannot receber pagamento" },
        { status: 400 }
      );
    }

    let servicesTotal = 0;
    const servicesNames: string[] = [];
    for (const s of booking.services) {
      if (s.service?.name) servicesNames.push(s.service.name);
      servicesTotal += s.service?.price ?? 0;
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const { total: productsTotal, label: productsLabel } = await saleTotalForItemsTx(tx, saleItems);
      const total = servicesTotal + productsTotal;
      const net = Math.max(total - discount + surcharge, 0);
      const change = method === "CASH" ? Math.max(amountReceived - net, 0) : 0;
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          method,
          total,
          discount,
          surcharge,
          netTotal: net,
          amountReceived,
          change,
          note,
        },
      });

      const noteParts = [
        `Booking: ${booking.clientName}`,
        servicesNames.length ? `Services: ${servicesNames.join(", ")}` : null,
        productsLabel ? `Bomboniere: ${productsLabel}` : null,
      ].filter(Boolean);

      await tx.cashEntry.create({
        data: {
          kind: "SALE",
          amount: net,
          note: noteParts.join(" • "),
          paymentId: payment.id,
          paymentMethod: method,
        },
      });

      if (change > 0) {
        await tx.cashEntry.create({
          data: {
            kind: "OUT",
            amount: change,
            note: `Troco agendamento ${booking.id}`,
            paymentId: payment.id,
            paymentMethod: method,
          },
        });
      }

      if (markDone && booking.status !== "DONE") {
        await consumeProductsCycleTx(tx, booking.id);

        if (saleItems.length > 0) {
          await createSaleTx(tx, {
            clientId: booking.clientId ?? null,
            bookingId: booking.id,
            items: saleItems,
            note: null,
          });
        }

        await tx.booking.update({ where: { id: booking.id }, data: { status: "DONE" } });
      }

      return payment;
    });

    return NextResponse.json({ ok: true, paymentId: result.id });
  } catch (e) {
    if (e instanceof Error && e.message === "PRODUCT_MISSING") {
      return NextResponse.json({ error: "Product invalid (consumo do service)." }, { status: 400 });
    }
    if (e instanceof Error && e.message === "STOCK_NEGATIVE") {
      return NextResponse.json({ error: "Inventory insuficiente para consumo." }, { status: 409 });
    }
    if (e instanceof Error && e.message === "NEGATIVE_STOCK") {
      return NextResponse.json(
        { error: "Inventory insuficiente para products selecionados." },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/bookings/[id]/pay FAILED:", e);
    return NextResponse.json({ error: "Error while recording pagamento" }, { status: 500 });
  }
}