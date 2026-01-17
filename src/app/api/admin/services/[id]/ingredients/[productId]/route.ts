import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string; productId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id, productId } = await ctx.params;

  if (!OID.test(id) || !OID.test(productId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.serviceProduct.deleteMany({ where: { serviceId: id, productId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/services/[id]/ingredients/[productId] FAILED:", e);
    return NextResponse.json({ error: "Error while  remover insumo" }, { status: 500 });
  }
}
