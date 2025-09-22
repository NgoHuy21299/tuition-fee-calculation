import { Hono } from "hono";
import { t } from "../../i18n/messages";
import { toAppError } from "../../errors";
import { StudentService } from "./studentService";
import { parseBodyWithSchema } from "../../validation/common/request";
import { CreateStudentSchema, UpdateStudentSchema } from "./studentSchemas";
import { uuidv7 } from "uuidv7";
import type { JwtPayload } from "../auth/jwtService";

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
    try {
      const url = new URL(c.req.url);
      const classId = url.searchParams.get("classId") || undefined;
      const svc = new StudentService({ db: c.env.DB });
      const { items, total } = await svc.listByTeacher({
        teacherId: String(user.sub),
        classId: classId || undefined,
      });
      return c.json({ items, total }, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // POST /api/students  (supports inline parent)
  router.post("/", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const parsed = await parseBodyWithSchema(c, CreateStudentSchema);
      if (!parsed.ok) {
        return c.json(
          { error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details: parsed.errors },
          400 as 400
        );
      }
      const svc = new StudentService({ db: c.env.DB });
      const id = uuidv7();
      const dto = await svc.create(String(user.sub), { id, ...parsed.value });
      return c.json(dto, 201 as 201);
    } catch (err) {
      console.log(err);
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // GET /api/students/:id (detail)
  router.get("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      const dto = await svc.getDetailById(String(user.sub), id);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // PUT /api/students/:id
  router.put("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const parsed = await parseBodyWithSchema(c, UpdateStudentSchema);
      if (!parsed.ok) {
        return c.json(
          { error: t("VALIDATION_ERROR"), code: "VALIDATION_ERROR", details: parsed.errors },
          400 as 400
        );
      }
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      const dto = await svc.update(String(user.sub), id, parsed.value);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // DELETE /api/students/:id
  router.delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const id = c.req.param("id");
      const svc = new StudentService({ db: c.env.DB });
      await svc.delete(String(user.sub), id);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  return router;
}
