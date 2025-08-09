import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const url = process.env.DATABASE_URL || "N/A";
    const count = await prisma.service.count();
    return NextResponse.json({ databaseUrl: url, serviceCount: count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
