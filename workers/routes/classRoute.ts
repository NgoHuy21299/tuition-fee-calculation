import { Hono } from "hono";
import type { JwtPayload } from "../services/jwtService";
import { t } from "../i18n/messages";
import { toAppError } from "../errors";
import { ClassService } from "../services/classService";
import {
  CreateClassSchema,
  UpdateClassSchema,
} from "../validation/class/classSchemas";
import { parseBodyWithSchema } from "../validation/common/request";

/**
 * Classes API (Base: /api/classes)
 * Auth: Protected by apiAuthGuard (applied globally in app.ts for /api/*)
 */
export function createClassRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  /**
   * GET /api/classes
   * Business rules:
   * - Default: return up to 10 rows, only isActive = true, ordered by createdAt desc (latest first)
   * - When query string isGetAll = true => return all (no limit, includes both active and inactive)
   * Returns: { items: ClassDTO[], total: number }
   */
  router.get("/", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const svc = new ClassService({ db: c.env.DB });
      const url = new URL(c.req.url);
      const isGetAll =
        (url.searchParams.get("isGetAll") || "").toLowerCase() === "true";
      const { items, total } = await svc.listByTeacher({
        teacherId: String(user.sub),
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
  router.post("/", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const parsed = await parseBodyWithSchema(c, CreateClassSchema);
      if (!parsed.ok) {
        return c.json(
          {
            error: t("VALIDATION_ERROR"),
            code: "VALIDATION_ERROR",
            details: parsed.errors,
          },
          400 as 400
        );
      }
      const svc = new ClassService({ db: c.env.DB });
      const id = crypto.randomUUID();
      const dto = await svc.create(String(user.sub), { id, ...parsed.value });
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
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const id = c.req.param("id");
      const svc = new ClassService({ db: c.env.DB });
      const dto = await svc.getById(String(user.sub), id);
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
  router.put("/:id", async (c) => {
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const id = c.req.param("id");
      const parsed = await parseBodyWithSchema(c, UpdateClassSchema);
      if (!parsed.ok) {
        return c.json(
          {
            error: t("VALIDATION_ERROR"),
            code: "VALIDATION_ERROR",
            details: parsed.errors,
          },
          400 as 400
        );
      }
      const svc = new ClassService({ db: c.env.DB });
      const dto = await svc.update(String(user.sub), id, parsed.value);
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
    const user = c.get("user");
    if (!user)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401 as 401
      );
    try {
      const id = c.req.param("id");
      const svc = new ClassService({ db: c.env.DB });
      await svc.delete(String(user.sub), id);
      return new Response(null, { status: 204 });
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
