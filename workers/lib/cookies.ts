// Cookie utilities (single responsibility: parse and serialize cookies)

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  maxAge?: number; // seconds
};

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(p.slice(0, idx).trim());
    const v = decodeURIComponent(p.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) segments.push(`Max-Age=${opts.maxAge}`);
  segments.push(`Path=${opts.path ?? "/"}`);
  if (opts.httpOnly) segments.push("HttpOnly");
  if (opts.secure) segments.push("Secure");
  if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
  return segments.join("; ");
}
