import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

interface ThresholdInput {
  lowStockThreshold?: number;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!id || !OID.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body: ThresholdInput = await req.json().catch(() => ({} as ThresholdInput));
  const raw = Number(body?.lowStockThreshold);
  const lowStockThreshold = Number.isFinite(raw) && raw >= 0 ? raw : null;

  if (lowStockThreshold === null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { lowStockThreshold },
      select: { id: true, lowStockThreshold: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/admin/products/[id]/threshold FAILED:", e);
    return NextResponse.json({ error: "Error while saving limite" }, { status: 500 });
  }
}
