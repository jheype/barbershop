import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type Mode = "PERCENT" | "FIXED";

type Payload = {
  enabled: boolean;
  mode: Mode;
  ownRate: number;
  withAssistantRate: number;
  assistantRate: number;
  productsRate: number;
  tipOnlyIfDone: boolean;
  tipIndependent: boolean;
};

const DEFAULT: Payload = {
  enabled: false,
  mode: "PERCENT",
  ownRate: 0,
  withAssistantRate: 0,
  assistantRate: 0,
  productsRate: 0,
  tipOnlyIfDone: true,
  tipIndependent: false,
};

type Ctx = { params: Promise<{ id: string }> };

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sanitize(body: unknown): Payload {
  const b = isRecord(body) ? body : {};
  const mode: Mode = b.mode === "FIXED" ? "FIXED" : "PERCENT";
  const max = mode === "PERCENT" ? 100 : 1_000_000;

  return {
    enabled: !!b.enabled,
    mode,
    ownRate: clamp(num(b.ownRate), 0, max),
    withAssistantRate: clamp(num(b.withAssistantRate), 0, max),
    assistantRate: clamp(num(b.assistantRate), 0, max),
    productsRate: clamp(num(b.productsRate), 0, max),
    tipOnlyIfDone: !!b.tipOnlyIfDone,
    tipIndependent: !!b.tipIndependent,
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json(DEFAULT);

  const row = await prisma.barberCommissionConfig.findUnique({
    where: { barberId: id },
    select: { payload: true },
  });

  return NextResponse.json(row?.payload ?? DEFAULT);
}

export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const exists = await prisma.barber.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Barber not found." }, { status: 404 });

  const body = await req.json().catch(() => ({} as unknown));
  const payload = sanitize(body);

  await prisma.barberCommissionConfig.upsert({
    where: { barberId: id },
    update: { payload },
    create: { barberId: id, payload },
  });

  return NextResponse.json({ ok: true });
}