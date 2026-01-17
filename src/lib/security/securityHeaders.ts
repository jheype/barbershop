import type { NextResponse } from "next/server";

const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
};

function cspFor(pathname: string) {
  const isDev = process.env.NODE_ENV !== "production";

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const isPanel = pathname.startsWith("/painel") || pathname.startsWith("/admin");

  const connectSrc = isPanel ? "connect-src 'self' https:" : "connect-src 'self'";

  return [
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    connectSrc,
  ].join("; ");
}

export function applySecurityHeaders(res: NextResponse, pathname = "/") {
  for (const [k, v] of Object.entries(BASE_HEADERS)) res.headers.set(k, v);

  res.headers.set("Content-Security-Policy", cspFor(pathname));

  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  return res;
}