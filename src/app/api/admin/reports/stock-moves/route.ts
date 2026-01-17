import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function range(from?: string | null, to?: string | null) {
  const now = new Date();
  const toD = to ? new Date(to) : now;
  const fromD = from ? new Date(from) : new Date(now.getTime() - 29 * 86400000);
  const start = new Date(fromD);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toD);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

type StockMoveWhere = {
  createdAt?: { gte?: Date; lte?: Date };
  kind?: "IN" | "OUT";
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const kind = url.searchParams.get("kind");
  const { start, end } = range(from, to);

  try {
    const where: StockMoveWhere = {
      createdAt: { gte: start, lte: end },
      ...(kind === "IN" || kind === "OUT" ? { kind } : {}),
    };

    const moves = await prisma.stockMove.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        kind: true,
        qty: true,
        note: true,
        createdAt: true,
        product: { select: { id: true, name: true, sku: true, unit: true } },
      },
    });

    type Move = typeof moves[number];

    const summary = moves.reduce(
      (acc: { total: number; byKind: Record<string, number> }, m: Move) => {
        acc.total += 1;
        acc.byKind[m.kind] = (acc.byKind[m.kind] || 0) + m.qty;
        return acc;
      },
      { total: 0, byKind: {} as Record<string, number> }
    );

    return NextResponse.json({ items: moves, summary });
  } catch {
    return NextResponse.json({ error: "Error while loading report" }, { status: 500 });
  }
}
