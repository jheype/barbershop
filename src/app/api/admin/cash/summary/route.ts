import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function parseRange(search: URLSearchParams) {
  const from = search.get("from");
  const to = search.get("to");
  const start = from ? new Date(from + "T00:00:00") : new Date();
  if (!from) start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to + "T23:59:59.999") : new Date();
  if (!to) end.setHours(23, 59, 59, 999);
  return { start, end };
}

type CashEntryRow = { kind: string; amount: number | null };

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const { start, end } = parseRange(url.searchParams);

    const entries: CashEntryRow[] = await prisma.cashEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { kind: true, amount: true },
      orderBy: { createdAt: "asc" },
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

    const inflow = opening + sales + inMov + adjust;
    const outflow = outMov + refund + (adjust < 0 ? Math.abs(adjust) : 0);
    const balance = opening + sales + inMov - outMov - refund + adjust;

    return NextResponse.json({
      from: start.toISOString(),
      to: end.toISOString(),
      kpis: {
        opening,
        sales,
        in: inMov,
        out: outMov,
        refund,
        adjust,
        balance,
        inflow,
        outflow,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/cash/summary FAILED:", e);
    return NextResponse.json({ error: "Error while loading resumo do caixa." }, { status: 500 });
  }
}
