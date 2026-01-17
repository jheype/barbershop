import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type Body = {
  amountCents?: number;
  date?: string | null;
  note?: string | null;
};

type Ctx = { params: Promise<{ id: string }> };

function toKey(v: string | null | undefined) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

export async function POST(req: Request, ctx: Ctx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });

  try {
    const body: Body = await req.json().catch(() => ({} as Body));
    const cents = Math.trunc(Number(body?.amountCents || 0));
    if (!Number.isFinite(cents) || cents <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    const barber = await prisma.barber.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!barber) return NextResponse.json({ error: "Barber not found." }, { status: 404 });

    const dateKey = toKey(body?.date ?? null);
    const noteIn = body?.note ? String(body.note).trim().slice(0, 160) : "";
    const note = [`Advance (${barber.name})`, dateKey ? `Date: ${dateKey}` : null, noteIn || null].filter(Boolean).join(" • ");

    const amount = Math.abs(cents) / 100;
    const cashEntry = await prisma.cashEntry.create({
      data: { kind: "OUT", amount: amount * -1, note: note || undefined },
    });

    const advance = await prisma.barberAdvance.create({
      data: {
        barberId: id,
        amountCents: cents,
        dateKey: dateKey || undefined,
        note: noteIn || undefined,
        cashEntryId: cashEntry.id,
      },
    });

    return NextResponse.json({ ok: true, advance, cashEntry });
  } catch (e) {
    console.error("POST /api/admin/barbers/[id]/advances FAILED:", e);
    return NextResponse.json({ error: "Error while recording vale." }, { status: 500 });
  }
}