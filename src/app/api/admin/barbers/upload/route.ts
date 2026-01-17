import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";
import { requireAdmin } from "@/lib/security/requireAdmin";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function safeExt(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  return "bin";
}

function detectMagic(buf: Uint8Array) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";

  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";

  // AVIF (ISO BMFF): box "ftyp" e brand "avif"/"avis"
  if (buf.length >= 16) {
    const ftyp =
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
    if (ftyp) {
      const ascii = new TextDecoder().decode(buf.slice(8, Math.min(buf.length, 64)));
      if (ascii.includes("avif") || ascii.includes("avis")) return "image/avif";
    }
  }

  return null;
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No arquivo enviado" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande" }, { status: 413 });
  }

  const ab = await file.arrayBuffer();
  const u8 = new Uint8Array(ab);

  const magic = detectMagic(u8);
  if (!magic) return NextResponse.json({ error: "Invalid file" }, { status: 415 });
  if (magic !== file.type) return NextResponse.json({ error: "File type mismatch" }, { status: 415 });

  const id = crypto.randomBytes(16).toString("hex");
  const ext = safeExt(file.type);
  const key = `barbers/${id}.${ext}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}