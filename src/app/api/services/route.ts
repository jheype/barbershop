import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const services = await prisma.service.findMany();
    return NextResponse.json(services);
}

export async function POST(req: Request) {
    const data = await req.json();
    const newService = await prisma.service.create({
        data,
    });
    return NextResponse.json(newService);
}