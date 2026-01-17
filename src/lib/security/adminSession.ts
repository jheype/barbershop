const te = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64: string) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64uEncode(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uDecode(str: string) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str + "=".repeat(padLen);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(b64);
}

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(payload));
  return b64uEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export type AdminSessionPayload = {
  iat: number;
  exp: number;
  nonce: string;
};

export async function createAdminSession(secret: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);

  const payloadObj: AdminSessionPayload = {
    iat: now,
    exp: now + ttlSeconds,
    nonce: b64uEncode(nonceBytes),
  };

  const payload = b64uEncode(te.encode(JSON.stringify(payloadObj)));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false as const };
  const [payload, sig] = parts;

  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return { ok: false as const };

  try {
    const json = new TextDecoder().decode(b64uDecode(payload));
    const data = JSON.parse(json) as AdminSessionPayload;

    if (!data?.exp || typeof data.exp !== "number") return { ok: false as const };
    const now = Math.floor(Date.now() / 1000);
    if (now >= data.exp) return { ok: false as const };

    return { ok: true as const, payload: data };
  } catch {
    return { ok: false as const };
  }
}

export function createCsrfToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64uEncode(bytes);
}

export function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
