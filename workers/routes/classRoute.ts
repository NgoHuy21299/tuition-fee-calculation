import { Hono } from "hono";
import type { JwtPayload } from "../services/jwtService";
import { t } from "../i18n/messages";

/**
 * Classes API (Base: /api/classes)
 * Auth: Protected by apiAuthGuard (applied globally in app.ts for /api/*)
 */
export function createClassRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  /**
   * GET /api/classes
   * Query: page?, pageSize?, q?, isActive?, sort?
   * Returns: { items: ClassDTO[], pageInfo: { page, pageSize, total } }
   */
  router.get("/", async (c) => {
    // TODO(UC-02 2.2/2.3): implement with repository + validation
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ message: "Not implemented", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  /**
   * POST /api/classes
   * Body: { name: string; subject?: string; description?: string; defaultFeePerSession?: number | null; isActive?: boolean }
   * Returns: ClassDTO
   */
  router.post("/", async (c) => {
    // TODO: validate body, create class for current teacher (user.sub)
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ message: "Not implemented", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  /**
   * GET /api/classes/:id
   * Returns: ClassDTO
   */
  router.get("/:id", async (c) => {
    // TODO: load class by id scoped to user.sub
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ message: "Not implemented", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  /**
   * PUT /api/classes/:id
   * Body: Partial<{ name; subject; description; defaultFeePerSession; isActive }>
   * Returns: ClassDTO
   */
  router.put("/:id", async (c) => {
    // TODO: validate patch, update class fields
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ message: "Not implemented", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  /**
   * DELETE /api/classes/:id
   * Returns: 204 on success; 409 if class has dependencies
   */
  router.delete("/:id", async (c) => {
    // TODO: dependency checks (ClassStudent/Session) then delete
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return new Response(null, { status: 501 });
  });

  return router;
}
