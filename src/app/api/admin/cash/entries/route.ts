import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function parseRange(search: URLSearchParams) {
  const from = search.get("from");
  const to = search.get("to");
  const start = from ? new Date(from + "T00:00:00") : new Date();
  if (!from) start.setHours(0,0,0,0);
  const end = to ? new Date(to + "T23:59:59.999") : new Date();
  if (!to) end.setHours(23,59,59,999);
  return { start, end };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const { start, end } = parseRange(url.searchParams);

    const items = await prisma.cashEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        amount: true,
        note: true,
        createdAt: true,
        paymentId: true,
        payment: { select: { method: true } },
      },
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/admin/cash/entries FAILED:", e);
    return NextResponse.json({ error: "Error while loading entries." }, { status: 500 });
  }
}
