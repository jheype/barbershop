import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function parseRange(search: URLSearchParams) {
  const from = search.get("from");
  const to = search.get("to");
  const start = from ? new Date(from + "T00:00:00") : new Date();
  if (!from) start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to + "T23:59:59.999") : new Date();
  if (!to) end.setHours(23, 59, 59, 999);
  return { start, end, from: from || start.toISOString().slice(0, 10), to: to || end.toISOString().slice(0, 10) };
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

type Entry = {
  kind: string;
  amount: number;
  note: string | null;
  createdAt: Date;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const { start, end, from, to } = parseRange(url.searchParams);

  const entries: Entry[] = await prisma.cashEntry.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
    select: { kind: true, amount: true, note: true, createdAt: true },
  });

  const rows = [
    ["Date/Time", "Type", "Amount", "Note"],
    ...entries.map((e: Entry) => [
      new Date(e.createdAt).toLocaleString("en-GB"),
      e.kind,
      String(e.amount).replace(".", ","),
      e.note ? e.note : "",
    ]),
  ];

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-caixa_${from}_a_${to}.csv"`,
    },
  });
}
