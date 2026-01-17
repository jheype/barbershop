import { NextResponse } from "next/server";
import {
  createAdminSession,
  createCsrfToken,
  timingSafeEqualStr,
} from "@/lib/security/adminSession";
import { clientIpFromRequest, rateLimit } from "@/lib/security/rateLimit";

const CLEAR_PATHS = ["/", "/api", "/api/admin", "/painel"];

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = await rateLimit({ key: `admin_login:${ip}`, windowMs: 60_000, max: 12 });
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    res.headers.set("Retry-After", Math.ceil((rl.resetAt - Date.now()) / 1000).toString());
    return res;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { username, password } = (body || {}) as { username?: string; password?: string };

  const envUser = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || "";
  const envPass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";

  if (!sessionSecret) {
    return NextResponse.json({ error: "Server misconfig" }, { status: 500 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const userOk = timingSafeEqualStr(String(username), envUser);
  const passOk = timingSafeEqualStr(String(password), envPass);
  if (!userOk || !passOk) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ttl = 60 * 60 * 24 * 7;
  const session = await createAdminSession(sessionSecret, ttl);
  const csrf = createCsrfToken();

  const res = NextResponse.json({ ok: true });

  // limpa cookies antigos em paths legados
  for (const p of CLEAR_PATHS) {
    res.cookies.set("admin_session", "", { path: p, maxAge: 0 });
    res.cookies.set("admin_csrf", "", { path: p, maxAge: 0 });
  }

  res.cookies.set("admin_session", session, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: ttl,
    secure: process.env.NODE_ENV === "production",
  });

  res.cookies.set("admin_csrf", csrf, {
    httpOnly: false,
    sameSite: "strict",
    path: "/",
    maxAge: ttl,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
