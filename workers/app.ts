import { Hono } from "hono";
import type { JwtPayload } from "./services/jwtService";
import { apiAuthGuard } from "./middleware/authMiddleware";
import { createAuthRouter } from "./routes/authRoute";
import { createHealthRouter } from "./routes/healthRoute";
// SSR handler removed: this Worker now serves API-only via Hono

const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// --- CORS middleware (Phase 3: token-based auth) ---
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin") || "*";
  await next();
  if (!c.res) return; // no response to decorate
  const headers = new Headers(c.res.headers);
  headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  c.res = new Response(c.res.body, { status: c.res.status, headers });
});

// Handle OPTIONS preflight early
app.options("*", (c) => {
  const origin = c.req.header("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// --- Middleware for /api/* ---
app.use("/api/*", apiAuthGuard);

// --- Auth routes ---
app.route("/api/auth", createAuthRouter());

// --- Health routes ---
app.route("/api", createHealthRouter());

// --- Silence Chrome DevTools probe route ---
app.get("/.well-known/appspecific/com.chrome.devtools.json", (c) => {
  return new Response(null, { status: 204 });
});

// Optional: respond at root with a simple message so the Worker isn't empty
app.get("/", (c) => c.text("OK: API is running."));

export default app;
