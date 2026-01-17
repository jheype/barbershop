import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

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

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  try {
    const barbers = await prisma.barber.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, photo: true, active: true },
    });

    const cfgRows = await prisma.barberCommissionConfig.findMany({
      where: { barberId: { in: barbers.map((b) => b.id) } },
      select: { barberId: true, payload: true },
    });
    const cfgByBarber = new Map<string, CommissionPayload>();
    for (const r of cfgRows) {
      const p = r.payload as unknown as CommissionPayload;
      cfgByBarber.set(r.barberId, {
        enabled: !!p?.enabled,
        mode: p?.mode === "FIXED" ? "FIXED" : "PERCENT",
        ownRate: Number(p?.ownRate ?? 0) || 0,
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { status: "DONE", barberId: { in: barbers.map((b) => b.id) } },
      select: {
        barberId: true,
        services: { select: { service: { select: { price: true } } } },
      },
    });

    const earnedByBarber = new Map<string, number>();
    for (const b of barbers) earnedByBarber.set(b.id, 0);
    for (const bk of bookings) {
      const bid = bk.barberId;
      if (!bid) continue;
      const cfg = cfgByBarber.get(bid) ?? null;
      let earned = 0;
      for (const s of bk.services) earned += earnedForServiceCents(s.service?.price ?? 0, cfg);
      earnedByBarber.set(bid, (earnedByBarber.get(bid) ?? 0) + earned);
    }

    const [salaryRows, advanceRows] = await Promise.all([
      prisma.barberSalaryPayment.findMany({
        where: { barberId: { in: barbers.map((b) => b.id) } },
        select: { barberId: true, amountCents: true },
      }),
      prisma.barberAdvance.findMany({
        where: { barberId: { in: barbers.map((b) => b.id) } },
        select: { barberId: true, amountCents: true },
      }),
    ]);

    const paidByBarber = new Map<string, number>();
    const advancesByBarber = new Map<string, number>();
    for (const b of barbers) {
      paidByBarber.set(b.id, 0);
      advancesByBarber.set(b.id, 0);
    }
    for (const r of salaryRows) {
      paidByBarber.set(r.barberId, (paidByBarber.get(r.barberId) ?? 0) + Math.abs(r.amountCents || 0));
    }
    for (const r of advanceRows) {
      advancesByBarber.set(r.barberId, (advancesByBarber.get(r.barberId) ?? 0) + Math.abs(r.amountCents || 0));
    }

    const items = barbers.map((b) => {
      const total = earnedByBarber.get(b.id) ?? 0;
      const paid = paidByBarber.get(b.id) ?? 0;
      const pending = Math.max(total - paid, 0);
      const advances = advancesByBarber.get(b.id) ?? 0;
      return {
        id: b.id,
        name: b.name,
        photo: b.photo,
        active: b.active,
        totalCents: total,
        paidCents: paid,
        pendingCents: pending,
        advancesPendingCents: advances,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/admin/remunerations FAILED:", e);
    return NextResponse.json({ error: "Error while loading payouts." }, { status: 500 });
  }
}
