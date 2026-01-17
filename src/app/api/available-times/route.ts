import { NextResponse } from "next/server";
import { computeAvailability } from "@/lib/availability/computeAvailability";

const OID = /^[a-fA-F0-9]{24}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const dateKey = (url.searchParams.get("date") || "").trim();
    const barberId = (url.searchParams.get("barberId") || "").trim();

    const raw =
      url.searchParams.get("serviceIds") ||
      url.searchParams.get("services") ||
      "";

    const serviceIds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!DATE_KEY.test(dateKey)) {
      return NextResponse.json({ error: "date invalid (YYYY-MM-DD)" }, { status: 400 });
    }

    if (barberId && !OID.test(barberId)) {
      return NextResponse.json({ error: "barberId invalid" }, { status: 400 });
    }

    const r = await computeAvailability({
      dateKey,
      barberId: barberId || null,
      serviceIds,
      stepMins: 15,
    });

    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    return NextResponse.json(r.slots, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to compute times." }, { status: 500 });
  }
}