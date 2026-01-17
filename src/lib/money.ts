export function centsToBRL(cents: number | null | undefined) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  const v = cents / 100;
  return v.toLocaleString("en-GB", { style: "currency", currency: "BRL" });
}

export function centsToNumber(cents: number | null | undefined) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return cents / 100;
}

export function parseBRLToCents(input: string) {
  const s = (input || "").trim();
  if (!s) return null;
  const normalized = s.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}