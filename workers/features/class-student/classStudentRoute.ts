import { Hono } from "hono";
import { t } from "../../i18n/errorMessages";
import { toAppError } from "../../errors";
import { ClassStudentService } from "./classStudentService";
import { AddClassStudentSchema, LeaveClassStudentSchema } from "./classStudentSchemas";
import { uuidv7 } from "uuidv7";
import { validateBody, getValidatedData } from "../../middleware/validationMiddleware";
import { getTeacherId } from "../../middleware/authMiddleware";
import type { JwtPayload } from "../auth/jwtService";
import type { InferOutput } from 'valibot';

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
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

  // POST /api/classes/:id/students (add member)
  router.post("/:id/students", validateBody(AddClassStudentSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const body = getValidatedData<InferOutput<typeof AddClassStudentSchema>>(c);
      const classId = c.req.param("id");
      const svc = new ClassStudentService({ db: c.env.DB, kv: c.env.KV });
      const id = uuidv7();
      const dto = await svc.add(teacherId, classId, { id, ...body });
      return c.json(dto, 201 as 201);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // DELETE /api/classes/:id/students/:classStudentId (not supported; prefer PUT to set leftAt)
  router.delete("/:id/students/:classStudentId", async (c) => {
    try {
      // ensure caller is authenticated
      getTeacherId(c);
      return c.json({ error: "NOT_IMPLEMENTED", code: "NOT_IMPLEMENTED" }, 501 as 501);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // PUT /api/classes/:id/students/:classStudentId (set leftAt)
  router.put("/:id/students/:classStudentId", validateBody(LeaveClassStudentSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const body = getValidatedData<InferOutput<typeof LeaveClassStudentSchema>>(c);
      const classId = c.req.param("id");
      const classStudentId = c.req.param("classStudentId");
      const svc = new ClassStudentService({ db: c.env.DB, kv: c.env.KV });
      await svc.leave(teacherId, classId, classStudentId, body);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  return router;
}
