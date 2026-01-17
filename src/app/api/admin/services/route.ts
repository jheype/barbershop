import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type ServiceInput = {
  name?: string;
  price?: number;
  duration?: number;
  category?: string | null;
  description?: string | null;
  active?: boolean;
};

export async function GET() {
  try {
    const items = await prisma.service.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/services FAILED:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const body: ServiceInput = await req.json().catch(() => ({} as ServiceInput));

    const name = String(body.name || "").trim();
    const price = Number(body.price || 0);
    const duration = Number(body.duration || 0);
    const category = body.category === null ? null : String(body.category || "").trim() || null;
    const description = body.description === null ? null : String(body.description || "").trim() || null;
    const active = body.active === false ? false : true;

    const missing: string[] = [];
    if (!name) missing.push("nome");
    if (!price || price < 0) missing.push("price");
    if (!duration || duration <= 0) missing.push("duration");

    if (missing.length) {
      return NextResponse.json(
        { error: `Informe: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }

    const created = await prisma.service.create({
      data: { name, price, duration, category, description, active },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/services FAILED:", e);
    return NextResponse.json({ error: "Error while creating service" }, { status: 500 });
  }
}
