import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isObjectId(id: string) {
    return /^[a-f\d]{24}$/i.test(id);
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || ""; // "id1,id2"
    const ids = idsParam.split(",").filter(isObjectId);

    if (ids.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

    const services = await prisma.service.findMany({
        where: { id: { in: ids } },
    });

    return NextResponse.json(services);
}