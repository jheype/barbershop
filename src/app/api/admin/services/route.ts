import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/services?q=&category=&active=1|0
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const activeParam = searchParams.get("active"); // "1" | "0" | null

    const where: any = {};
    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }
    if (category) where.category = category;
    if (activeParam === "1") where.active = true;
    if (activeParam === "0") where.active = false;

    const services = await prisma.service.findMany({
        where,
        orderBy: { name: "asc" },
    });

    return NextResponse.json(services);
}

// POST /api/admin/services
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, price, duration, category, description, active } = body as {
            name: string; price: number; duration: number;
            category?: string; description?: string; active?: boolean;
        };

        if (!name || typeof price !== "number" || typeof duration !== "number") {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
        }

        const created = await prisma.service.create({
            data: {
                name,
                price,
                duration,
                category: category || null,
                description: description || null,
                active: typeof active == "boolean" ? active : true,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
    }
}