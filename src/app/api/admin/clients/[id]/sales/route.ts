import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const url = new URL(req.url);
  const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(50, Math.max(5, toInt(url.searchParams.get("pageSize"), 10)));

  try {
    const [total, rows] = await Promise.all([
      prisma.sale.count({ where: { clientId: id } }),
      prisma.sale.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          booking: { select: { id: true, date: true } },
          items: { select: { productName: true, qty: true } },
        },
      }),
    ]);

    return NextResponse.json({ total, items: rows }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/clients/[id]/sales FAILED:", e);
    return NextResponse.json({ error: "Error while loading consumos" }, { status: 500 });
  }
}
