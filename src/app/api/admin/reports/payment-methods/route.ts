import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type MethodKey = "CASH" | "PIX" | "CARD_DEBIT" | "CARD_CREDIT" | "OTHER";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toDateOrNull(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeMethod(v: string | null): MethodKey {
  const s = (v || "").trim().toUpperCase();
  if (s === "CASH") return "CASH";
  if (s === "PIX") return "PIX";
  if (s === "CARD_DEBIT") return "CARD_DEBIT";
  if (s === "CARD_CREDIT") return "CARD_CREDIT";
  return "OTHER";
}

function signedAmount(kind: string, amount: number) {
  const k = (kind || "").toUpperCase();
  if (k === "OUT" || k === "REFUND") return -Math.abs(amount);
  if (k === "OPENING" || k === "IN" || k === "SALE") return Math.abs(amount);
  return amount;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const today = new Date();
    const defaultTo = endOfDay(today);
    const defaultFrom = startOfDay(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

    const fromDate = startOfDay(toDateOrNull(fromParam) ?? defaultFrom);
    const toDate = endOfDay(toDateOrNull(toParam) ?? defaultTo);

    const entries = await prisma.cashEntry.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { kind: true, amount: true, paymentMethod: true },
      orderBy: { createdAt: "asc" },
    });

    const byMethod: Record<MethodKey, number> = {
      CASH: 0,
      PIX: 0,
      CARD_DEBIT: 0,
      CARD_CREDIT: 0,
      OTHER: 0,
    };

    let total = 0;
    for (const and of entries) {
      const amt = signedAmount(String(e.kind), Number(e.amount || 0));
      const method = normalizeMethod(e.paymentMethod ?? null);
      byMethod[method] += amt;
      total += amt;
    }

    const items = (Object.keys(byMethod) as MethodKey[]).map((method) => ({
      method,
      amount: Number(byMethod[method].toFixed(2)),
    }));

    return NextResponse.json({
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      total: Number(total.toFixed(2)),
      byMethod: items,
    });
  } catch (e) {
    console.error("GET /api/admin/reports/payment-methods FAILED:", e);
    return NextResponse.json({ error: "Error while  gerar report" }, { status: 500 });
  }
}
