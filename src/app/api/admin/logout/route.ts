import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });
    // apaga o cookie
    res.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
    return res;
}