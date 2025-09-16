import { Hono } from "hono";
import type { JwtPayload } from "../services/jwtService";
import { t } from "../i18n/messages";
import { toAppError } from "../errors";
import { ClassStudentService } from "../services/classStudentService";
import { parseBodyWithSchema } from "../validation/common/request";
import { AddClassStudentSchema, LeaveClassStudentSchema } from "../validation/classStudent/classStudentSchemas";

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

  // POST /api/classes/:id/students (add member)
  router.post("/:id/students", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const parsed = await parseBodyWithSchema(c, AddClassStudentSchema);
      if (!parsed.ok) {
        return c.json(
          { error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details: parsed.errors },
          400 as 400
        );
      }
      const classId = c.req.param("id");
      const svc = new ClassStudentService({ db: c.env.DB });
      const id = crypto.randomUUID();
      const dto = await svc.add(String(user.sub), classId, { id, ...parsed.value });
      return c.json(dto, 201 as 201);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // DELETE /api/classes/:id/students/:classStudentId (not supported; prefer PUT to set leftAt)
  router.delete("/:id/students/:classStudentId", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    return c.json({ error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" }, 501 as 501);
  });

  // PUT /api/classes/:id/students/:classStudentId (set leftAt)
  router.put("/:id/students/:classStudentId", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const parsed = await parseBodyWithSchema(c, LeaveClassStudentSchema);
      if (!parsed.ok) {
        return c.json(
          { error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details: parsed.errors },
          400 as 400
        );
      }
      const classId = c.req.param("id");
      const classStudentId = c.req.param("classStudentId");
      const svc = new ClassStudentService({ db: c.env.DB });
      await svc.leave(String(user.sub), classId, classStudentId, parsed.value);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  return router;
}
