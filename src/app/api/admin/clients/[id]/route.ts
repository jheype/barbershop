import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

async function getParamId(ctx: unknown): Promise<string> {
  if (!isRecord(ctx)) return "";
  const paramsAny = (ctx as Record<string, unknown>).params;

  if (paramsAny && typeof (paramsAny as Promise<unknown>)?.then === "function") {
    const awaited = await (paramsAny as Promise<unknown>);
    if (isRecord(awaited)) return str(awaited.id).trim();
    return "";
  }

  if (isRecord(paramsAny)) return str(paramsAny.id).trim();
  return "";
}

export async function GET(req: Request, ctx: unknown) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const id = await getParamId(ctx);
    if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phoneRaw: true,
        phoneNormalized: true,
        active: true,
        notes: true,
        lastVisitAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { clientId: id },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        date: true,
        status: true,
        barber: { select: { id: true, name: true, photo: true } },
        services: { select: { service: { select: { id: true, name: true, price: true, duration: true } } } },
      },
    });

    const done = bookings.filter((b) => b.status === "DONE");

    const counts: Record<string, number> = {};
    const byId: Record<string, { id: string; name: string; photo?: string | null }> = {};
    for (const b of bookings) {
      if (b.status === "CANCELED") continue;
      if (!b.barber) continue;
      counts[b.barber.id] = (counts[b.barber.id] ?? 0) + 1;
      if (!byId[b.barber.id]) byId[b.barber.id] = b.barber;
    }
    let favoriteBarber: { id: string; name: string; photo?: string | null } | null = null;
    let best = 0;
    for (const [id, c] of Object.entries(counts)) {
      if (c > best) {
        best = c;
        favoriteBarber = byId[id] ?? null;
      }
    }

    const lastVisitAt = bookings[0]?.date ?? null;

    const totals = done.map((b) => (b.services || []).reduce((acc, s) => acc + (s.service?.price || 0), 0));
    const ticketAvg = totals.length ? totals.reduce((a, v) => a + v, 0) / totals.length : null;

    const freqDays =
      done.length >= 2
        ? (() => {
            const ds = done.map((b) => new Date(b.date).getTime()).sort((a, b) => a - b);
            const gaps: number[] = [];
            for (let i = 1; i < ds.length; i++) gaps.push((ds[i] - ds[i - 1]) / (1000 * 60 * 60 * 24));
            return gaps.length ? gaps.reduce((a, v) => a + v, 0) / gaps.length : null;
          })()
        : null;

    return NextResponse.json(
      {
        client,
        bookings,
        favoriteBarber,
        metrics: { lastVisitAt, ticketAvg, freqDays },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error("GET /api/admin/clients/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while loading cliente." }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: unknown) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const id = await getParamId(ctx);
    if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = isRecord(bodyUnknown) ? bodyUnknown : {};

    const name = str(body.name).trim();
    const phoneRaw = str(body.phone).trim();
    const notes = str(body.notes).trim();
    if (notes && (notes.includes("<") || notes.includes(">"))) {
      return NextResponse.json({ error: "Notes devem ser texto puro." }, { status: 400 });
    }
    const activeRaw = body.active;

    const data: Record<string, unknown> = {};

    if (name) data.name = name;

    if (phoneRaw) {
      const phoneNormalized = phoneRaw.replace(/\D+/g, "");
      if (!phoneNormalized) return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
      data.phoneRaw = phoneRaw;
      data.phoneNormalized = phoneNormalized;
    }

    if (typeof notes === "string") data.notes = notes || null;
    if (typeof activeRaw === "boolean") data.active = activeRaw;

    const updated = await prisma.client.update({
      where: { id },
      data,
      select: { id: true },
    });

    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch (e: unknown) {
    console.error("PATCH /api/admin/clients/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while  atualizar cliente." }, { status: 500 });
  }
}