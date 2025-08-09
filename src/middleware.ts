import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [/^\/painel($|\/)/, /^\/api\/admin($|\/)/];

// rotas que DEVEM ficar liberadas, mesmo sob /api/admin/*
const ALLOWLIST = [
  /^\/api\/admin\/login($|\/)/,
  /^\/api\/admin\/logout($|\/)/,
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === "OPTIONS") return NextResponse.next();
  if (ALLOWLIST.some((re) => re.test(pathname))) return NextResponse.next();

  const isProtected = PROTECTED_PATHS.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = req.cookies.get("admin_session")?.value;
  const expected = process.env.ADMIN_SESSION_TOKEN;

  if (sessionCookie && expected && sessionCookie === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/painel/:path*", "/api/admin/:path*"],
};
