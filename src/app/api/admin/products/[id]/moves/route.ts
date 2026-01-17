import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type StockMoveKind = "IN" | "OUT" | "ADJUST";

interface StockMoveInput {
  kind?: StockMoveKind;
  qty?: number;
  note?: string | null;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body: StockMoveInput = await req.json().catch(() => ({} as StockMoveInput));
  const kind: StockMoveKind = (body.kind as StockMoveKind) || "IN";
  const qty = Number(body.qty ?? 0);
  const noteRaw = body.note == null ? null : String(body.note).trim();
  const note = noteRaw ? noteRaw.slice(0, 160) : null;

  if (!["IN", "OUT", "ADJUST"].includes(kind)) {
    return NextResponse.json({ error: "Type invalid" }, { status: 400 });
  }
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: "Quantidade must ser > 0" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id }, select: { stockQty: true } });
      if (!p) throw new Error("NOT_FOUND");

      const delta = kind === "IN" ? qty : kind === "OUT" ? -qty : 0;
      if (delta < 0 && p.stockQty + delta < 0) throw new Error("NEGATIVE");

      await tx.stockMove.create({
        data: { productId: id, kind, qty, note: note ?? undefined, createdAt: new Date() },
      });

      if (delta !== 0) {
        await tx.product.update({
          where: { id },
          data: { stockQty: { increment: delta }, updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND")
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (e instanceof Error && e.message === "NEGATIVE")
      return NextResponse.json({ error: "Inventory insuficiente" }, { status: 409 });
    console.error("POST /api/admin/products/[id]/moves FAILED:", e);
    return NextResponse.json({ error: "Error while  movimentar estoque" }, { status: 500 });
  }
}
