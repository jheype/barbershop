export function normalizePhone(input: string | null | undefined) {
  const raw = (input || "").trim();
  if (!raw) return { raw: null, normalized: null };

  const digits = raw.replace(/\D+/g, "");
  if (!digits) return { raw, normalized: null };

  const normalized = digits.length > 11 ? digits.slice(-11) : digits;
  return { raw, normalized };
}
