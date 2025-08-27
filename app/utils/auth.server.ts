// Server-side auth utilities for React Router loaders running on Cloudflare Workers
// Minimal HS256 JWT verification (duplicated from workers side to avoid cross-bundle imports)

import { COOKIE_NAME } from "workers/constants";

export type JwtPayload = Record<string, unknown> & {
  exp?: number; // seconds since epoch
  iat?: number; // seconds since epoch
  sub?: string;
  email?: string;
};

function base64urlDecode(b64: string): Uint8Array {
  const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
  const std = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHS256Key(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function verifyJWT(token: string, secret: string): Promise<JwtPayload | null> {
  const enc = new TextEncoder();
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const data = `${h}.${p}`;
  const sig = base64urlDecode(s);

  const key = await importHS256Key(secret);
  const ok = await crypto.subtle.verify({ name: "HMAC" }, key, sig, enc.encode(data));
  if (!ok) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(p))) as JwtPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(/;\s*/).forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = decodeURIComponent(pair.slice(0, idx).trim());
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

export async function requireUser(request: Request, env: Env) {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  // Use default cookie name 'auth' consistent with workers/constants.ts
  const token = cookies[COOKIE_NAME];
  const secret = env.JWT_SECRET;
  if (!token || !secret) return null;
  const payload = await verifyJWT(token, secret);
  return payload; // null if invalid
}
