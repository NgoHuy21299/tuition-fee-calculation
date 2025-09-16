import { Hono } from "hono";
import type { JwtPayload } from "../services/jwtService";
import { t } from "../i18n/messages";

/**
 * Class-Student membership API (Mounted under /api/classes)
 * Endpoints (as per plan):
 *  - POST   /api/classes/:id/students         (add student to class)
 *  - DELETE /api/classes/:id/students/:csId   (remove membership) – may be replaced by PUT to set leftAt
 *  - PUT    /api/classes/:id/students/:csId   (set leftAt) – preferred per plan
 *
 * Part 2.1: Route stubs only (return 501). Implementations will be filled in Part 2.2+.
 */
export function createClassStudentRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  // POST /api/classes/:id/students
  router.post("/:id/students", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  // DELETE /api/classes/:id/students/:classStudentId
  router.delete("/:id/students/:classStudentId", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  // PUT /api/classes/:id/students/:classStudentId (set leftAt)
  router.put("/:id/students/:classStudentId", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401 as 401);
    return c.json({ error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  return router;
}
