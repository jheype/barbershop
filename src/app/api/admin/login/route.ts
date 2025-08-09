import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const USER = process.env.ADMIN_USERNAME;
  const PASS = process.env.ADMIN_PASSWORD;
  const TOKEN = process.env.ADMIN_SESSION_TOKEN;

  if (!USER || !PASS || !TOKEN) {
    return NextResponse.json(
      { error: "Variáveis de ambiente ausentes (ADMIN_*)." },
      { status: 500 }
    );
  }

  if (username !== USER || password !== PASS) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_session", TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
