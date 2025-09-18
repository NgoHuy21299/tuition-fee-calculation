import { Hono } from "hono";

export function createHealthRouter() {
  const router = new Hono<{ Bindings: Env }>();

  // Simple health check endpoint
  router.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  // Liveness probe (alias)
  router.get("/live", (c) => c.json({ status: "live" }));

  // Readiness probe (checks basic env wiring)
  router.get("/ready", (c) => {
    const ready = Boolean(c.env && c.env.DB);
    return c.json({ status: ready ? "ready" : "not-ready" }, ready ? 200 : 503);
  });

  // Authentication check
  router.get("/auth-check", (c) => c.json({ status: "authenticated" }));

  return router;
}
