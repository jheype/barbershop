import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const moves = await prisma.stockMove.findMany({
      where: {
        OR: [
          { note: { startsWith: `booking:${id}:done:` } },
          { note: { startsWith: `booking:${id}:revert:` } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    });

    const payload = moves.map((m: typeof moves[number]) => ({
      id: m.id,
      createdAt: m.createdAt,
      kind: m.kind,
      qty: m.qty,
      note: m.note,
      product: m.product
        ? { id: m.product.id, name: m.product.name, sku: m.product.sku ?? null, unit: m.product.unit ?? null }
        : null,
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/admin/bookings/[id]/stock-moves FAILED:", e);
    return NextResponse.json({ error: "Error while loading movimentos" }, { status: 500 });
  }
}
