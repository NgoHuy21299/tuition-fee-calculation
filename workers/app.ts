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

app.get("*", (c) => {
  const ssr = createSSRHandler();
  return ssr(c.req.raw, c.env, c.executionCtx);
});

export default app;
