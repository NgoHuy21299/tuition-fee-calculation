import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { AuthService } from "./lib/auth";
import { verifyJWT, signJWT, type JwtPayload } from "./lib/jwt";
import { parseCookies, serializeCookie } from "./lib/cookies";
import { COOKIE_MAX_AGE, COOKIE_NAME, PUBLIC_API_PATHS, PUBLIC_PATHS } from "./constants";

const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// --- Helpers ---
function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
function isPublicApiPath(path: string) {
  return PUBLIC_API_PATHS.includes(path);
}

// --- Middleware for /api/* ---
app.use("/api/*", async (c, next) => {
  const url = new URL(c.req.url);
  // Allow public API endpoints
  if (isPublicApiPath(url.pathname)) {
    return next();
  }

  const cookieHeader = c.req.header("Cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const JWT_SECRET = (c.env as any).JWT_SECRET as string | undefined;
  if (!JWT_SECRET) {
    // Fail closed if not configured; instruct to set secret
    return c.json({ error: "Server misconfigured: JWT_SECRET missing" }, 500);
  }
  const payload = await verifyJWT(token, JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Attach user context for downstream handlers (if needed)
  c.set("user", payload);
  await next();
});

// --- Auth endpoints ---
app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) {
    return c.text("Missing credentials", 400);
  }
  const auth = new AuthService({ db: c.env.DB });
  const user = await auth.verifyCredentials(email, password);
  if (!user) {
    return c.text("Invalid email or password", 401);
  }

  const JWT_SECRET = (c.env as any).JWT_SECRET as string | undefined;
  if (!JWT_SECRET) {
    return c.text("Server misconfigured: JWT_SECRET missing", 500);
  }
  const payload = auth.buildJwtPayload(user, COOKIE_MAX_AGE);
  const token = await signJWT(payload, JWT_SECRET);

  const cookie = serializeCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": cookie },
  });
});

app.post("/api/auth/logout", async (c) => {
  const cookie = serializeCookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
  return new Response(null, { status: 204, headers: { "Set-Cookie": cookie } });
});

// Register new user and set cookie
app.post("/api/auth/register", async (c) => {
  const body = await c.req.json<{ email: string; password: string; name?: string }>().catch(() => null);
  if (!body || !body.email || !body.password) {
    return c.text("Missing fields", 400);
  }
  const { email, password, name } = body;
  const auth = new AuthService({ db: c.env.DB });
  try {
    const created = await auth.createUser({ email, password, name });

    const JWT_SECRET = (c.env as any).JWT_SECRET as string | undefined;
    if (!JWT_SECRET) {
      return c.text("Server misconfigured: JWT_SECRET missing", 500);
    }
    const payload = auth.buildJwtPayload(created, COOKIE_MAX_AGE);
    const token = await signJWT(payload, JWT_SECRET);

    const cookie = serializeCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie } });
  } catch (err) {
    const msg = (err as Error).message || "Registration failed";
    if (/already registered/i.test(msg)) {
      return c.text("Email đã được đăng ký", 409);
    }
    return c.text(msg, 400);
  }
});

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
