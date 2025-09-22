import { verifyJWT, type JwtPayload } from "../features/auth/jwtService";
import { PUBLIC_API_PATHS } from "../constants";
import type { Context, Next } from "hono";

// Auth guard for /api/* except PUBLIC_API_PATHS
export async function apiAuthGuard(c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) {
  const url = new URL(c.req.url);
  // Allow public API endpoints
  if (PUBLIC_API_PATHS.includes(url.pathname)) {
    return next();
  }

  // Phase 3: Only accept Authorization header (Bearer <token>)
  const authHeader = c.req.header("Authorization") || c.req.header("authorization");
  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
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

