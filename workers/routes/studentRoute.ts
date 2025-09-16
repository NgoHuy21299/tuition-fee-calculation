import { Hono } from "hono";
import type { JwtPayload } from "../services/jwtService";
import { t } from "../i18n/messages";

/**
 * Students API (Base: /api/students)
 * Auth: Protected globally by apiAuthGuard in app.ts for /api/*
 *
 * Part 2.1: Route stubs only (return 501). Implementations will be filled in Part 2.2+.
 */
export function createStudentRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  // GET /api/students?classId=
  router.get("/", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json(
      { error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" },
      501 as 501
    );
  });

  // POST /api/students  (supports bulk and parentInline)
  router.post("/", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json(
      { error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" },
      501 as 501
    );
  });

  // GET /api/students/:id
  router.get("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json(
      { error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" },
      501 as 501
    );
  });

  // PUT /api/students/:id
  router.put("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json(
      { error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" },
      501 as 501
    );
  });

  // DELETE /api/students/:id
  router.delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json(
      { error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" },
      501 as 501
    );
  });

  return router;
}
