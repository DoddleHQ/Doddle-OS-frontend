export function normalizeDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const hostname = url.hostname;
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return trimmed;
  }
}
