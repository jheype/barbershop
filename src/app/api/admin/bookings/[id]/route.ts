import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;
type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";

function noteDone(bookingId: string, ts: number) {
  return `booking:${bookingId}:done:${ts}`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { barber: true, services: { include: { service: true } } },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json(booking);
  } catch (e) {
    console.error("GET /api/admin/bookings/[id]", e);
    return NextResponse.json({ error: "Error while loading" }, { status: 500 });
  }
}

async function sumProductsForBookingTx(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      services: {
        include: {
          service: { include: { products: { include: { product: true } } } },
        },
      },
    },
  });
  if (!booking) throw new Error("Booking not found");
  const totals = new Map<string, number>();
  for (const bs of booking.services) {
    const svc = bs.service;
    if (!svc) continue;
    for (const link of svc.products ?? []) {
      const pid = link.productId;
      const q = Number(link.quantityPerService ?? 0);
      if (!pid || q <= 0) continue;
      totals.set(pid, (totals.get(pid) || 0) + q);
    }
  }
  return totals;
}

async function consumeProductsCycleTx(tx: Prisma.TransactionClient, bookingId: string) {
  const totals = await sumProductsForBookingTx(tx, bookingId);
  if (totals.size === 0) return null;
  const ts = Date.now();
  const note = noteDone(bookingId, ts);
  const moves: Array<{ productId: string; kind: "OUT"; qty: number; note: string }> =
    Array.from(totals.entries()).map(([productId, qty]) => ({ productId, kind: "OUT", qty, note }));
  await tx.stockMove.createMany({ data: moves });
  for (const [productId, qty] of totals.entries()) {
    await tx.product.update({ where: { id: productId }, data: { stockQty: { decrement: qty } } });
  }
  return ts;
}

async function revertLastConsumptionCycleTx(tx: Prisma.TransactionClient, bookingId: string) {
  const lastOut = await tx.stockMove.findMany({
    where: { kind: "OUT", note: { startsWith: `booking:${bookingId}:done:` } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (lastOut.length === 0) return;
  const m = (lastOut[0].note || "").match(/^booking:([a-fA-F0-9]{24}):done:(\d+)$/);
  if (!m) return;
  const ts = m[2];
  const already = await tx.stockMove.count({
    where: { kind: "IN", note: `booking:${bookingId}:revert:${Number(ts)}` },
  });
  if (already > 0) return;
  const outsOfCycle = await tx.stockMove.findMany({
    where: { kind: "OUT", note: `booking:${bookingId}:done:${Number(ts)}` },
  });
  if (outsOfCycle.length === 0) return;
  await tx.stockMove.createMany({
    data: outsOfCycle.map((mv: { productId: string; qty: number }) => ({
      productId: mv.productId,
      kind: "IN" as const,
      qty: mv.qty,
      note: `booking:${bookingId}:revert:${Number(ts)}`,
    })),
  });
  for (const mv of outsOfCycle) {
    await tx.product.update({ where: { id: mv.productId }, data: { stockQty: { increment: mv.qty } } });
  }
}

type ServiceDur = { service: { duration: number | null } | null };
type BookingWithServices = { date: Date; services: ServiceDur[] };

function totalDuration(services: ServiceDur[]): number {
  return services.reduce<number>((acc, s) => acc + (s?.service?.duration ?? 0), 0) || 30;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = body as {
    clientName?: string;
    date?: string;
    barberId?: string | null;
    status?: BookingStatus;
  };
  if (parsed.status && !["SCHEDULED", "CONFIRMED", "DONE", "CANCELED"].includes(parsed.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.booking.findUnique({
        where: { id },
        include: { services: { include: { service: true } } },
      });
      if (!current) throw new Error("NOT_FOUND");
      const nextDate = parsed.date ? new Date(parsed.date) : new Date(current.date);
      if (parsed.date && isNaN(nextDate.getTime())) throw new Error("INVALID_DATE");
      const nextBarberId = parsed.barberId === undefined ? current.barberId : parsed.barberId ?? null;
      const isDateChanged = parsed.date ? nextDate.getTime() !== new Date(current.date).getTime() : false;
      const isBarberChanged = parsed.barberId !== undefined && nextBarberId !== current.barberId;
      const mustCheckConflict = (isDateChanged || isBarberChanged) && !!nextBarberId;
      if (mustCheckConflict) {
        const durationMin = totalDuration(current.services as unknown as ServiceDur[]);
        const endDate = new Date(nextDate.getTime() + durationMin * 60 * 1000);
        const dayStart = new Date(nextDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const candidates = await tx.booking.findMany({
          where: {
            id: { not: id },
            barberId: nextBarberId!,
            status: { not: "CANCELED" },
            date: { gte: dayStart, lt: dayEnd },
          },
          include: { services: { include: { service: true } } },
        });
        const overlaps = candidates.some((b: BookingWithServices) => {
          const otherStart = new Date(b.date);
          const otherDur = totalDuration(b.services);
          const otherEnd = new Date(otherStart.getTime() + otherDur * 60 * 1000);
          return nextDate < otherEnd && endDate > otherStart;
        });
        if (overlaps) throw new Error("CONFLICT");
      }
      const prevStatus: BookingStatus = current.status as BookingStatus;
      const nextStatus: BookingStatus = (parsed.status ?? prevStatus) as BookingStatus;
      const saved = await tx.booking.update({
        where: { id },
        data: {
          clientName: parsed.clientName ?? current.clientName,
          date: nextDate,
          barberId: nextBarberId,
          ...(parsed.status ? { status: nextStatus } : {}),
        },
        include: { barber: true, services: { include: { service: true } } },
      });

if (saved.clientId) {
  await tx.client.update({
    where: { id: saved.clientId },
    data: {
      name: saved.clientName,
      ...(nextStatus !== "CANCELED" ? { lastVisitAt: saved.date } : {}),
    },
  });
}

      if (prevStatus !== "DONE" && nextStatus === "DONE") {
        await consumeProductsCycleTx(tx, saved.id);
      } else if (prevStatus === "DONE" && nextStatus !== "DONE") {
        await revertLastConsumptionCycleTx(tx, saved.id);
      }
      return saved;
    });
    return NextResponse.json(updated);
  } catch (e) {
    const err = e as unknown;
    if (err instanceof Error && err.message === "NOT_FOUND")
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (err instanceof Error && err.message === "INVALID_DATE")
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    if (err instanceof Error && err.message === "CONFLICT")
      return NextResponse.json({ error: "Time conflict for this barber." }, { status: 409 });
    console.error("PATCH /api/admin/bookings/[id] TX FAILED:", e);
    return NextResponse.json({ error: "Error while  atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new Error("NOT_FOUND");
      if (b.status === "DONE") {
        await revertLastConsumptionCycleTx(tx, id);
      }
      await tx.bookingService.deleteMany({ where: { bookingId: id } });
      await tx.booking.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as unknown;
    if (err instanceof Error && err.message === "NOT_FOUND")
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    console.error("DELETE /api/admin/bookings/[id]", e);
    return NextResponse.json({ error: "Error while  excluir" }, { status: 500 });
  }
}
