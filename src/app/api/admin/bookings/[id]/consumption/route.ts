import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const OID = /^[a-fA-F0-9]{24}$/;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(_req);
  if (guard) return guard;
  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { services: { include: { service: true } } },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const serviceIds = booking.services
      .map((bs: { service: { id: string } | null }) => bs.service?.id)
      .filter((x: string | undefined): x is string => typeof x === "string");

    if (serviceIds.length === 0) return NextResponse.json([]);

    const links = await prisma.serviceProduct.findMany({
      where: { serviceId: { in: serviceIds } },
      include: { product: true },
    });

    const byProduct = new Map<
      string,
      { productId: string; name: string; unit: string | null; qty: number }
    >();

    for (const l of links) {
      const qty = Number(l.quantityPerService) || 0;
      if (qty <= 0) continue;
      const existing = byProduct.get(l.productId);
      if (existing) {
        existing.qty += qty;
      } else {
        byProduct.set(l.productId, {
          productId: l.productId,
          name: l.product?.name || "(product)",
          unit: l.product?.unit ?? null,
          qty,
        });
      }
    }

    return NextResponse.json(Array.from(byProduct.values()));
  } catch (e) {
    console.error("GET /api/admin/bookings/[id]/consumption FAILED:", e);
    return NextResponse.json({ error: "Error while  calcular consumo" }, { status: 500 });
  }
}
