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
  const date = url.searchParams.get("date") || undefined;
  const { start, end, ymd } = dayRange(date);

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
      "Content-Disposition": `attachment; filename="fechamento-${ymd}.csv"`,
    },
  });
}
