import { verifyJWT, type JwtPayload } from "../services/jwtService";
import { parseCookies } from "../services/cookiesService";
import { COOKIE_NAME, PUBLIC_API_PATHS } from "../constants";
import type { Context, Next } from "hono";

// Auth guard for /api/* except PUBLIC_API_PATHS
export async function apiAuthGuard(c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) {
  const url = new URL(c.req.url);
  // Allow public API endpoints
  if (PUBLIC_API_PATHS.includes(url.pathname)) {
    return next();
  }

  // Prefer Authorization header (Bearer token). Fallback to cookie for compatibility during migration.
  const authHeader = c.req.header("Authorization") || c.req.header("authorization");
  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else {
    const cookieHeader = c.req.header("Cookie");
    const cookies = parseCookies(cookieHeader);
    token = cookies[COOKIE_NAME];
  }
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const JWT_SECRET = c.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return c.json({ error: "Server misconfigured: JWT_SECRET missing" }, 500);
  }
  const payload = await verifyJWT(token, JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", payload);
  await next();
}

