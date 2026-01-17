import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";
import { clientIpFromRequest, rateLimit } from "@/lib/security/rateLimit";
import { createSaleTx, parseSaleItems } from "@/lib/sales";

const OID = /^[a-fA-F0-9]{24}$/;

const PAYMENT_METHODS = ["CASH", "PIX", "CARD_DEBIT", "CARD_CREDIT", "OTHER"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return n;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const clientId = str(url.searchParams.get("clientId")).trim();
  const bookingId = str(url.searchParams.get("bookingId")).trim();
  const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
  const pageSize = Math.min(50, Math.max(5, toInt(url.searchParams.get("pageSize"), 20)));

  const where: Record<string, unknown> = {};
  if (OID.test(clientId)) where.clientId = clientId;
  if (OID.test(bookingId)) where.bookingId = bookingId;

  try {
    const [total, rows] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { productName: true, qty: true } }, booking: { select: { id: true, date: true } } },
      }),
    ]);

    return NextResponse.json({ total, items: rows }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/sales FAILED:", e);
    return NextResponse.json({ error: "Error while  listar vendas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const ip = clientIpFromRequest(req);
  const rl = await rateLimit({ key: `sales:create:${ip}`, windowMs: 10_000, max: 25 });
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    res.headers.set("Retry-After", Math.ceil((rl.resetAt - Date.now()) / 1000).toString());
    return res;
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const items = parseSaleItems(body.items);
  if (items === null) return NextResponse.json({ error: "items invalid" }, { status: 400 });

  const clientId = str(body.clientId).trim();
  const bookingId = str(body.bookingId).trim();
  const note = str(body.note).trim();
  const methodIn = str(body.method).trim() as PaymentMethod;
  const method: PaymentMethod = PAYMENT_METHODS.includes(methodIn) ? methodIn : "OTHER";

  try {
    const saleId = await prisma.$transaction(async (tx) => {
      const id = await createSaleTx(tx, {
        clientId: OID.test(clientId) ? clientId : null,
        bookingId: OID.test(bookingId) ? bookingId : null,
        note: note || null,
        items: items || [],
      });

      const sale = await tx.sale.findUnique({
        where: { id },
        select: {
          id: true,
          totalCents: true,
          client: { select: { name: true } },
          items: { select: { productName: true, qty: true } },
        },
      });

      if (sale) {
        const itemsLabel = sale.items
          .map((it) => `${it.productName} x${it.qty}`)
          .slice(0, 12)
          .join(", ");

        const noteParts = [
          "Bomboniere",
          sale.client?.name ? `Client: ${sale.client.name}` : null,
          itemsLabel ? `items: ${itemsLabel}` : null,
        ].filter(Boolean);

        await tx.cashEntry.create({
          data: {
            kind: "SALE",
            amount: (sale.totalCents || 0) / 100,
            note: noteParts.join(" • "),
            paymentMethod: method,
            saleId: sale.id,
          },
        });
      }

      return id;
    });

    return NextResponse.json({ id: saleId }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "EMPTY")
      return NextResponse.json({ error: "Informe ao menos 1 item" }, { status: 400 });
    if (e instanceof Error && e.message === "MISSING")
      return NextResponse.json({ error: "Product invalid" }, { status: 400 });
    if (e instanceof Error && e.message === "INACTIVE")
      return NextResponse.json({ error: "Product inativo" }, { status: 409 });
    if (e instanceof Error && e.message === "NEGATIVE")
      return NextResponse.json({ error: "Inventory insuficiente" }, { status: 409 });
    if (e instanceof Error && e.message === "DUP_BOOKING")
      return NextResponse.json({ error: "Esta venda has already been registrada para este agendamento" }, { status: 409 });
    console.error("POST /api/admin/sales FAILED:", e);
    return NextResponse.json({ error: "Error while recording venda" }, { status: 500 });
  }
}
