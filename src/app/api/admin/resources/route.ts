import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

type ResourceWhere = {
  name?: { contains: string; mode?: "insensitive" };
  active?: boolean;
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const activeParam = url.searchParams.get("active");

  const where: ResourceWhere = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (activeParam === "1") where.active = true;
  if (activeParam === "0") where.active = false;

  try {
    const items = await prisma.resource.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Error while loading recursos" }, { status: 500 });
  }
}

interface ResourceInput {
  name?: string;
  dailyCapacity?: number;
  active?: boolean;
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  const body: ResourceInput = await req.json().catch(() => ({} as ResourceInput));
  const name = String(body.name || "").trim();
  const dailyCapacity = Number(body.dailyCapacity);
  const active = Boolean(body.active ?? true);

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (Number.isNaN(dailyCapacity) || dailyCapacity < 0) {
    return NextResponse.json({ error: "Capacidade daily invalid" }, { status: 400 });
  }

  try {
    const created = await prisma.resource.create({
      data: { name, dailyCapacity, active },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error while creating recurso" }, { status: 500 });
  }
}
