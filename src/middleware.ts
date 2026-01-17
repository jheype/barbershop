import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/security/adminSession";
import { applySecurityHeaders } from "@/lib/security/securityHeaders";

const PROTECTED_PATHS = [/^\/painel($|\/)/, /^\/api\/admin($|\/)/];

const ALLOWLIST = [
  /^\/api\/admin\/login($|\/)/,
  /^\/api\/admin\/logout($|\/)/,
  /^\/api\/health($|\/)/,
];

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function isAuthed(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session")?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionCookie || !secret) return false;
  const v = await verifyAdminSession(sessionCookie, secret);
  return v.ok;
}

function hasValidCsrf(req: NextRequest) {
  if (!CSRF_METHODS.has(req.method)) return true;
  const csrfCookie = req.cookies.get("admin_csrf")?.value;
  const csrfHeader = req.headers.get("x-admin-csrf");
  return Boolean(csrfCookie && csrfHeader && csrfCookie === csrfHeader);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === "OPTIONS") return applySecurityHeaders(NextResponse.next(), pathname);

  if (ALLOWLIST.some((re) => re.test(pathname))) {
    return applySecurityHeaders(NextResponse.next(), pathname);
  }

  const isProtected = PROTECTED_PATHS.some((re) => re.test(pathname));
  if (!isProtected) return applySecurityHeaders(NextResponse.next(), pathname);

  const authed = await isAuthed(req);

  if (pathname.startsWith("/api/admin/")) {
    if (!authed) {
      return applySecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), pathname);
    }
    if (!hasValidCsrf(req)) {
      return applySecurityHeaders(NextResponse.json({ error: "CSRF" }, { status: 403 }), pathname);
    }
    return applySecurityHeaders(NextResponse.next(), pathname);
  }

  if (pathname.startsWith("/painel")) {
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return applySecurityHeaders(NextResponse.redirect(url), pathname);
    }
    return applySecurityHeaders(NextResponse.next(), pathname);
  }

  return applySecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: ["/painel/:path*", "/api/admin/:path*"],
};