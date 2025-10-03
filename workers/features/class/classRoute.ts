import { Hono } from "hono";
import type { JwtPayload } from "../auth/jwtService";
import { t } from "../../i18n/errorMessages";
import { toAppError } from "../../errors";
import { ClassService } from "./classService";
import {
  CreateClassSchema,
  UpdateClassSchema,
} from "./classSchemas";
import { validateBody, getValidatedData } from "../../middleware/validationMiddleware";
import { getTeacherId } from "../../middleware/authMiddleware";
import { uuidv7 } from "uuidv7";
import type { InferOutput } from 'valibot';

/**
 * Classes API (Base: /api/classes)
 * Auth: Protected by apiAuthGuard (applied globally in app.ts for /api/*)
 */
export function createClassRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

  /**
   * GET /api/classes
   * Business rules:
   * - Default: return up to 10 rows, only isActive = true, ordered by createdAt desc (latest first)
   * - When query string isGetAll = true => return all (no limit, includes both active and inactive)
   * Returns: { items: ClassDTO[], total: number }
   */
  router.get("/", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const svc = new ClassService({ db: c.env.DB, kv: c.env.KV });
      const url = new URL(c.req.url);
      const isGetAll =
        (url.searchParams.get("isGetAll") || "").toLowerCase() === "true";
      const { items, total } = await svc.listByTeacher({
        teacherId,
        isActive: isGetAll ? undefined : true,
        sort: "createdAt_desc",
        limit: isGetAll ? undefined : 10,
      });
      return c.json({ items, total }, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  /**
   * POST /api/classes
   * Body: { name: string; subject?: string; description?: string; defaultFeePerSession?: number | null; isActive?: boolean }
   * Returns: ClassDTO
   */
  router.post("/", validateBody(CreateClassSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const body = getValidatedData<InferOutput<typeof CreateClassSchema>>(c);
      const svc = new ClassService({ db: c.env.DB, kv: c.env.KV });
      const id = uuidv7();
      const dto = await svc.create(teacherId, { id, ...body });
      return c.json(dto, 201 as 201);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  /**
   * GET /api/classes/:id
   * Returns: ClassDTO
   */
  router.get("/:id", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const id = c.req.param("id");
      const svc = new ClassService({ db: c.env.DB, kv: c.env.KV });
      const dto = await svc.getById(teacherId, id);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  /**
   * PUT /api/classes/:id
   * Body: Partial<{ name; subject; description; defaultFeePerSession; isActive }>
   * Returns: ClassDTO
   */
  router.put("/:id", validateBody(UpdateClassSchema), async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const id = c.req.param("id");
      const body = getValidatedData<InferOutput<typeof UpdateClassSchema>>(c);
      const svc = new ClassService({ db: c.env.DB, kv: c.env.KV });
      const dto = await svc.update(teacherId, id, body);
      return c.json(dto, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  /**
   * DELETE /api/classes/:id
   * Returns: 204 on success; 409 if class has dependencies
   */
  router.delete("/:id", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const id = c.req.param("id");
      const svc = new ClassService({ db: c.env.DB, kv: c.env.KV });
      await svc.delete(teacherId, id);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  /**
   * GET /api/classes/:classId/sessions
   * List all sessions for a specific class
   */
  router.get("/:classId/sessions", async (c) => {
    try {
      const teacherId = getTeacherId(c);
      const classId = c.req.param("classId");
      const { SessionService } = await import("../session/sessionService");
      const svc = new SessionService({ db: c.env.DB });
      // Optional time filters
      const startTimeBegin = c.req.query('startTimeBegin') || undefined;
      const startTimeEnd = c.req.query('startTimeEnd') || undefined;
      const result = await svc.listByClass(
        classId,
        teacherId,
        startTimeBegin,
        startTimeEnd
      );
      return c.json(result, 200 as 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  return router;
}
