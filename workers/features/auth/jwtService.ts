// Lightweight JWT HS256 utilities for Cloudflare Workers (Web Crypto based)
// Focused on a single responsibility: sign and verify tokens.

export type JwtPayload = Record<string, unknown> & {
  exp?: number; // seconds since epoch
  iat?: number; // seconds since epoch
  sub?: string;
};

export async function signJWT(
  payload: JwtPayload,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const body = { iat, ...payload };

  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(body)));
  const data = `${headerB64}.${payloadB64}`;

  const key = await importHS256Key(secret);
  const sig = await crypto.subtle.sign(
    { name: "HMAC" },
    key,
    enc.encode(data),
  );
  const sigB64 = base64urlEncode(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  const enc = new TextEncoder();
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const data = `${h}.${p}`;
  const sig = base64urlDecode(s);

  const key = await importHS256Key(secret);
  const ok = await crypto.subtle.verify(
    { name: "HMAC" },
    key,
    sig,
    enc.encode(data),
  );
  if (!ok) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(p))) as JwtPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
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

function base64urlEncode(bytes: Uint8Array): string {
  // atob/btoa not available for Uint8Array directly; use Buffer-like polyfill via String.fromCharCode
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  // btoa exists in Workers runtime
  const b64 = btoa(str)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return b64;
}

function base64urlDecode(b64: string): ArrayBuffer {
  const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
  const std = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
