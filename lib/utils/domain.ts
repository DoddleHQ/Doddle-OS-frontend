/**
 * Domain normalization using JavaScript's built-in URL constructor.
 *
 * Handles all user input variations:
 *   https://www.example.com        → example.com
 *   http://example.com/path        → example.com
 *   www.example.com                → example.com
 *   example.com                    → example.com
 *   https://blog.example.com:8080  → blog.example.com
 *
 * Uses new URL() for parsing (no regex for the hostname extraction).
 */

export function normalizeDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // URL() requires a protocol to parse correctly. Prepend https:// if missing.
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const hostname = url.hostname;
    // Strip leading www. using string methods (not regex)
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    // If URL() can't parse it (e.g., completely malformed), return the raw input
    return trimmed;
  }
}
