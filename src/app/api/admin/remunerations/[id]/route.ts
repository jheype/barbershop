import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type CommissionPayload = {
  enabled: boolean;
  mode: "PERCENT" | "FIXED";
  ownRate: number;
};

function toCentsBRL(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function earnedForServiceCents(price: number, cfg: CommissionPayload | null) {
  const priceCents = toCentsBRL(price);
  if (!cfg || !cfg.enabled) return priceCents;
  if (cfg.mode === "FIXED") return Math.max(0, Math.round(cfg.ownRate * 100));
  return Math.max(0, Math.round(priceCents * (cfg.ownRate / 100)));
}

function payoutLabel(cfg: CommissionPayload | null) {
  if (!cfg || !cfg.enabled) return "Amount total";
  if (cfg.mode === "FIXED") return `Fixed commission (£ ${Number(cfg.ownRate || 0).toFixed(2)})`;
  return `Commission (${Number(cfg.ownRate || 0)}%)`;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  try {
    const barber = await prisma.barber.findUnique({
      where: { id },
      select: { id: true, name: true, photo: true, active: true },
    });
    if (!barber) return NextResponse.json({ error: "Barber not found." }, { status: 404 });

    const cfgRow = await prisma.barberCommissionConfig.findFirst({
      where: { barberId: id },
      select: { payload: true },
    });
    const p = (cfgRow?.payload as unknown as CommissionPayload) ?? null;
    const cfg: CommissionPayload | null = p
      ? {
          enabled: !!p.enabled,
          mode: p.mode === "FIXED" ? "FIXED" : "PERCENT",
          ownRate: Number(p.ownRate ?? 0) || 0,
        }
      : null;

    const [bookings, salaryRows, advanceRows] = await Promise.all([
      prisma.booking.findMany({
        where: { status: "DONE", barberId: id },
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          clientName: true,
          services: { select: { service: { select: { name: true, price: true } } } },
          payments: { orderBy: { createdAt: "desc" }, take: 1, select: { method: true } },
        },
      }),
      prisma.barberSalaryPayment.findMany({
        where: { barberId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, amountCents: true, dateKey: true, note: true, createdAt: true },
      }),
      prisma.barberAdvance.findMany({
        where: { barberId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, amountCents: true, dateKey: true, note: true, createdAt: true },
      }),
    ]);

    const earnings = bookings.map((bk) => {
      const baseCents = bk.services.reduce((a, s) => a + toCentsBRL(s.service?.price ?? 0), 0);
      const earnedCents = bk.services.reduce((a, s) => a + earnedForServiceCents(s.service?.price ?? 0, cfg), 0);
      const servicesLabel = bk.services.map((s) => s.service?.name).filter(Boolean).join(", ") || "—";
      const method = bk.payments?.[0]?.method ?? null;

      return {
        bookingId: bk.id,
        date: bk.date,
        clientName: bk.clientName,
        servicesLabel,
        payoutType: payoutLabel(cfg),
        paymentMethod: method,
        baseCents,
        earnedCents,
      };
    });

    // Allocate salary payments to the oldest earnings first.
    let paidPool = salaryRows.reduce((a, r) => a + Math.abs(r.amountCents || 0), 0);
    const rows = earnings.map((e) => {
      const paid = Math.min(Math.max(paidPool, 0), e.earnedCents);
      paidPool -= paid;
      return {
        ...e,
        paidCents: paid,
        pendingCents: Math.max(e.earnedCents - paid, 0),
      };
    });

    const totalEarnedCents = rows.reduce((a, r) => a + r.earnedCents, 0);
    const totalPaidCents = salaryRows.reduce((a, r) => a + Math.abs(r.amountCents || 0), 0);
    const totalPendingCents = Math.max(totalEarnedCents - totalPaidCents, 0);
    const advancesPendingCents = advanceRows.reduce((a, r) => a + Math.abs(r.amountCents || 0), 0);

    return NextResponse.json({
      barber,
      summary: {
        totalEarnedCents,
        totalPaidCents,
        totalPendingCents,
        advancesPendingCents,
      },
      items: rows,
      payments: salaryRows,
      advances: advanceRows,
    });
  } catch (e) {
    console.error("GET /api/admin/remunerations/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while loading detalhes." }, { status: 500 });
  }
}
