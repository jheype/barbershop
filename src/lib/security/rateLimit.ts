type RateLimitArgs = {
  key: string;
  windowMs: number;
  max: number;
};

type RateLimitOk = { ok: true; remaining: number; resetAt: number };
type RateLimitFail = { ok: false; remaining: 0; resetAt: number };
export type RateLimitResult = RateLimitOk | RateLimitFail;

type Bucket = {
  count: number;
  resetAt: number;
};

const mem = new Map<string, Bucket>();

export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}

export async function rateLimit(args: RateLimitArgs): Promise<RateLimitResult> {
  const now = Date.now();
  const cur = mem.get(args.key);

  if (!cur || cur.resetAt <= now) {
    const resetAt = now + args.windowMs;
    mem.set(args.key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, args.max - 1), resetAt };
  }

  if (cur.count >= args.max) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  mem.set(args.key, cur);

  return { ok: true, remaining: Math.max(0, args.max - cur.count), resetAt: cur.resetAt };
}