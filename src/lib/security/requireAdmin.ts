import { NextResponse } from "next/server";
import { verifyAdminSession } from "./adminSession";
import { clientIpFromRequest, rateLimit } from "./rateLimit";

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
  return "";
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(reason: string) {
  return NextResponse.json({ error: reason }, { status: 403 });
}

export async function requireAdmin(req: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return unauthorized();

  const session = getCookie(req, "admin_session");
  if (!session) return unauthorized();

  const v = await verifyAdminSession(session, secret);
  if (!v.ok) return unauthorized();

  if (CSRF_METHODS.has(req.method)) {
    const csrfCookie = getCookie(req, "admin_csrf");
    const csrfHeader = req.headers.get("x-admin-csrf");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) return forbidden("CSRF");
  }

  const ip = clientIpFromRequest(req);
  const rl = await rateLimit({ key: `admin:${ip}`, windowMs: 10_000, max: 60 });
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    res.headers.set("Retry-After", Math.ceil((rl.resetAt - Date.now()) / 1000).toString());
    return res;
  }

  return null;
}