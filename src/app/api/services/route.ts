import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || "24"), 1), 60);

  const where: any = {};
  if (q.length >= 2) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.service.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}


export async function POST(req: Request) {
  const data = await req.json();
  const created = await prisma.service.create({ data });
  return NextResponse.json(created);
}
