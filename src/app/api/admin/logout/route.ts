import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/requireAdmin";

const CLEAR_PATHS = ["/", "/api", "/api/admin", "/painel"];

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const res = NextResponse.json({ ok: true });

  // clear on all likely paths (prevents leftover cookies)
  for (const p of CLEAR_PATHS) {
    res.cookies.set("admin_session", "", { path: p, maxAge: 0 });
    res.cookies.set("admin_csrf", "", { path: p, maxAge: 0 });
  }

  return res;
}
