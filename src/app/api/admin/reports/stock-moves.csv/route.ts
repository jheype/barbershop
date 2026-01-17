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
  const kindParam = url.searchParams.get("kind");
  const { start, end } = range(from, to);

  const where: StockMoveWhere = { createdAt: { gte: start, lte: end } };
  if (kindParam === "IN" || kindParam === "OUT") where.kind = kindParam;

  const moves = await prisma.stockMove.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      kind: true,
      qty: true,
      note: true,
      product: { select: { name: true, sku: true, unit: true } },
    },
  });

  const rows: string[][] = [
    ["data", "tipo", "product", "sku", "un", "quantidade", "observacao"],
    ...moves.map((m: typeof moves[number]) => [
      new Date(m.createdAt).toISOString(),
      m.kind,
      m.product?.name ?? "",
      m.product?.sku ?? "",
      m.product?.unit ?? "",
      String(m.qty),
      m.note?.replaceAll('"', '""') ?? "",
    ]),
  ];

  const csv = rows.map((cols: string[]) => cols.map((c: string) => `"${c}"`).join(",")).join("\n");

  const enc = new TextEncoder().encode(csv);
  return new Response(enc, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-moves.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
