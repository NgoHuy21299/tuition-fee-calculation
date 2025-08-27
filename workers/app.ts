import { Hono } from "hono";
import type { JwtPayload } from "./lib/jwt";
import { apiAuthGuard } from "./middleware/auth";
import { createAuthRouter } from "./routes/auth";
import { createSSRHandler } from "./handlers/ssr";

const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// --- Middleware for /api/* ---
app.use("/api/*", apiAuthGuard);

// --- Auth routes ---
app.route("/api/auth", createAuthRouter());

// --- Silence Chrome DevTools probe route ---
app.get("/.well-known/appspecific/com.chrome.devtools.json", (c) => {
  return new Response(null, { status: 204 });
});

app.get("*", (c) => {
  const ssr = createSSRHandler();
  return ssr(c.req.raw, c.env, c.executionCtx);
});

export default app;
