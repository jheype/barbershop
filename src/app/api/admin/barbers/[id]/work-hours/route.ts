import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type WorkDay = {
  weekday: Day;
  enabled: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
};

type Ctx = { params: Promise<{ id: string }> };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function clampTime(v: unknown) {
  const s = String(v ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(s)) return "";
  const [hh, mm] = s.split(":").map((n) => parseInt(n, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
  if (hh < 0 || hh > 23) return "";
  if (mm < 0 || mm > 59) return "";
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function defaultDays(): WorkDay[] {
  return Array.from({ length: 7 }).map((_, i) => ({
    weekday: i as Day,
    enabled: i !== 0,
    start: "09:00",
    end: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
  }));
}

function normalizeDays(raw: unknown): WorkDay[] {
  const base = defaultDays();
  if (!Array.isArray(raw) || raw.length !== 7) return base;

  const out: WorkDay[] = [];
  const seen = new Set<number>();

  for (const item of raw) {
    if (!isRecord(item)) continue;

    const weekday = Number(item.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (seen.has(weekday)) continue;
    seen.add(weekday);

    const enabled = !!item.enabled;

    const start = clampTime(item.start);
    const end = clampTime(item.end);
    const lunchStart = clampTime(item.lunchStart);
    const lunchEnd = clampTime(item.lunchEnd);

    out.push({
      weekday: weekday as Day,
      enabled,
      start: start || base[weekday].start,
      end: end || base[weekday].end,
      lunchStart: lunchStart || "",
      lunchEnd: lunchEnd || "",
    });
  }

  if (out.length !== 7) return base;
  out.sort((a, b) => a.weekday - b.weekday);
  return out;
}

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ days: defaultDays() });

  const row = await prisma.barberWorkHours.findUnique({
    where: { barberId: id },
    select: { days: true },
  });

  const days = normalizeDays(row?.days);
  return NextResponse.json({ days });
}

export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({} as unknown));
    const days = normalizeDays(isRecord(body) ? body.days : undefined);

    await prisma.barberWorkHours.upsert({
      where: { barberId: id },
      create: { barberId: id, days },
      update: { days },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed ao salvar." }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  return PUT(req, ctx);
}
