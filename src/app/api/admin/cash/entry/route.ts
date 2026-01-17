import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type CashKind = "OPENING" | "IN" | "OUT" | "ADJUST" | "REFUND";
type CashEntryBody = { kind?: CashKind; amount?: number; note?: string | null };

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const body: CashEntryBody = await req.json().catch(() => ({} as CashEntryBody));
    const kind: CashKind = body?.kind || "IN";
    const amountRaw = Number(body?.amount);
    const note: string | null = body?.note ? String(body.note) : null;

    if (!["OPENING", "IN", "OUT", "ADJUST", "REFUND"].includes(kind)) {
      return NextResponse.json({ error: "Type invalid." }, { status: 400 });
    }
    if (Number.isNaN(amountRaw)) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    let amount = amountRaw;
    if (kind === "OUT" || kind === "REFUND") {
      amount = Math.abs(amountRaw) * -1;
    }
    if (kind === "OPENING" || kind === "IN") {
      amount = Math.abs(amountRaw);
    }

    const created = await prisma.cashEntry.create({
      data: { kind, amount, note: note || undefined },
    });

    return NextResponse.json({ ok: true, entry: created });
  } catch (e) {
    console.error("POST /api/admin/cash/entry FAILED:", e);
    return NextResponse.json({ error: "Error while creating entry." }, { status: 500 });
  }
}
