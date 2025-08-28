import { Hono } from "hono";
import type { JwtPayload } from "./services/jwtService";
import { apiAuthGuard } from "./middleware/authMiddleware";
import { createAuthRouter } from "./routes/authRoute";
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
