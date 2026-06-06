export function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, "");
}

export function isValidPhone(normalized: string): boolean {
  return normalized.length >= 10 && normalized.length <= 13;
}

export function formatPhoneDisplay(normalized: string): string {
  const d = normalized;
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return normalized;
}
