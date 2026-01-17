import { NextResponse } from "next/server";
import { createCsrfToken, verifyAdminSession } from "@/lib/security/adminSession";

function getCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export async function GET(req: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Server misconfig" }, { status: 500 });

  const session = getCookie(req, "admin_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const v = await verifyAdminSession(session, secret);
  if (!v.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csrf = createCsrfToken();
  const ttl = 60 * 60 * 24 * 7;

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_csrf", csrf, {
    httpOnly: false,
    sameSite: "strict",
    path: "/",
    maxAge: ttl,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}