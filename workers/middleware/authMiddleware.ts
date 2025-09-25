import { verifyJWT, type JwtPayload } from "../features/auth/jwtService";
import { PUBLIC_API_PATHS } from "../constants";
import type { Context, Next } from "hono";
import { AppError } from "../errors";

// Auth guard for /api/* except PUBLIC_API_PATHS
export async function apiAuthGuard(c: Context<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>, next: Next) {
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
  c.set("teacherId", String(payload.sub));
  await next();
}

/**
 * Helper function để lấy teacherId từ context một cách an toàn
 * Sử dụng trong các route handler sau khi đã apply requireTeacher middleware
 */
export function getTeacherId(c: Context<any>): string {
  const teacherId = c.get("teacherId");
  if (!teacherId) {
    throw new AppError("AUTH_UNAUTHORIZED", "Unauthorized", 401);
  }
  return teacherId;
}

