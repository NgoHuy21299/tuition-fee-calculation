import { Hono } from "hono";
import { t } from "../../i18n/errorMessages";
import { toAppError } from "../../errors";
import { StudentService } from "./studentService";
import { validateBody, getValidatedData } from "../../middleware/validationMiddleware";
import { CreateStudentSchema, UpdateStudentSchema } from "./studentSchemas";
import { uuidv7 } from "uuidv7";
import type { JwtPayload } from "../auth/jwtService";
import { getTeacherId } from "../../middleware/authMiddleware";
import type { InferOutput } from 'valibot';

/**
 * Students API (Base: /api/students)
 * Auth: Protected globally by apiAuthGuard in app.ts for /api/*
 *
 * Part 2.1: Route stubs only (return 501). Implementations will be filled in Part 2.2+.
 */
export function createStudentRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

  // GET /api/students?classId=
  router.get("/", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const url = new URL(c.req.url);
      const classId = url.searchParams.get("classId") || undefined;
      const svc = new StudentService({ db: c.env.DB });
      const { items, total } = await svc.listByTeacher({
        teacherId,
        classId: classId || undefined,
      });
      return c.json({ items, total }, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // POST /api/students  (supports inline parent)
  router.post("/", validateBody(CreateStudentSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const body = getValidatedData<InferOutput<typeof CreateStudentSchema>>(c);
      const svc = new StudentService({ db: c.env.DB });
      const id = uuidv7();
      const dto = await svc.create(teacherId, { id, ...body });
      return c.json(dto, 201 as 201);
    } catch (err) {
      console.log(err);
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // GET /api/students/:id (detail)
  router.get("/:id", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      const dto = await svc.getDetailById(teacherId, id);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // PUT /api/students/:id
  router.put("/:id", validateBody(UpdateStudentSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const body = getValidatedData<InferOutput<typeof UpdateStudentSchema>>(c);
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      const dto = await svc.update(teacherId, id, body);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // DELETE /api/students/:id
  router.delete("/:id", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      await svc.delete(teacherId, id);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  return router;
}
