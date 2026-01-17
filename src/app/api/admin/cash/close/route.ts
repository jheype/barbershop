import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function dayRange(dateParam?: string) {
  const base = dateParam ? new Date(dateParam) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end, ymd: start.toISOString().slice(0, 10) };
}

type CashEntryRow = {
  id: string;
  kind: string;
  amount: number | null;
  note: string | null;
  createdAt: Date;
  paymentId: string | null;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || undefined;
    const { start, end, ymd } = dayRange(date);

    const entries: CashEntryRow[] = await prisma.cashEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, amount: true, note: true, createdAt: true, paymentId: true },
    });

    const sum = (k: string) =>
      entries
        .filter((e: CashEntryRow) => e.kind === k)
        .reduce((a: number, b: CashEntryRow) => a + Number(b.amount ?? 0), 0);

    const opening = sum("OPENING");
    const sales = sum("SALE");
    const inMov = sum("IN");
    const outMov = sum("OUT");
    const refund = sum("REFUND");
    const adjust = sum("ADJUST");

    const inflow = opening + sales + inMov + (adjust > 0 ? adjust : 0);
    const outflow = outMov + refund + (adjust < 0 ? Math.abs(adjust) : 0);
    const balance = opening + sales + inMov - outMov - refund + adjust;

    return NextResponse.json({
      date: ymd,
      totals: { opening, sales, in: inMov, out: outMov, refund, adjust, inflow, outflow, balance },
      entries,
    });
  } catch (e) {
    console.error("GET /api/admin/cash/close FAILED:", e);
    return NextResponse.json({ error: "Error while  calcular fechamento do dia." }, { status: 500 });
  }
}
