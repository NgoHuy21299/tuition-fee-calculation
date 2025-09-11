import { Hono } from "hono";
import { AuthService } from "../services/authService";
import { signJWT, type JwtPayload } from "../services/jwtService";
import { COOKIE_MAX_AGE } from "../constants";
import { toAppError } from "../errors";
import { t } from "../i18n/messages";

export function createAuthRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  router.post("/login", async (c) => {
    const { email, password } = await c.req.json<{ email: string; password: string }>();
    if (!email || !password) {
      return c.json({ error: t("AUTH_MISSING_CREDENTIALS"), code: "AUTH_MISSING_CREDENTIALS" }, 400 as 400);
    }
    const auth = new AuthService({ db: c.env.DB });
    const user = await auth.verifyCredentials(email, password);
    if (!user) {
      return c.json({ error: t("AUTH_INVALID_CREDENTIALS"), code: "AUTH_INVALID_CREDENTIALS" }, 401 as 401);
    }

    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return c.json({ error: t("SERVER_MISCONFIGURED"), code: "SERVER_MISCONFIGURED" }, 500 as 500);
    }
    const payload = auth.buildJwtPayload(user, COOKIE_MAX_AGE);
    const token = await signJWT(payload, JWT_SECRET);

    // Return token in body for client-side storage (no cookies in Phase 3)
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  router.post("/logout", async () => {
    // No cookie to clear in Phase 3; clients should delete local token
    return new Response(null, { status: 204 });
  });

  // Change password (requires apiAuthGuard set user variable)
  router.post("/change-password", async (c) => {
    const body = await c.req
      .json<{ oldPassword: string; newPassword: string }>()
      .catch(() => null);
    if (!body) return c.json({ error: t("AUTH_INVALID_JSON"), code: "AUTH_INVALID_JSON" }, 400);
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword)
      return c.json({ error: t("AUTH_MISSING_FIELDS"), code: "AUTH_MISSING_FIELDS" }, 400);
    if (newPassword.length < 8)
      return c.json({ error: t("AUTH_PASSWORD_TOO_SHORT"), code: "AUTH_PASSWORD_TOO_SHORT" }, 400);

    const user = c.get("user");
    const userId = (user?.sub as string) || "";
    if (!userId) return c.json({ error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" }, 401);

    const auth = new AuthService({ db: c.env.DB });
    try {
      await auth.changePassword(userId, oldPassword, newPassword);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: t(e.code, e.message), code: e.code }, e.status as any);
    }
  });

  // Register new user and set cookie
  router.post("/register", async (c) => {
    const body = await c.req
      .json<{ email: string; password: string; name?: string }>()
      .catch(() => null);
    if (!body || !body.email || !body.password) {
      return c.json({ error: t("AUTH_MISSING_FIELDS"), code: "AUTH_MISSING_FIELDS" }, 400);
    }
    const { email, password, name } = body;
    const auth = new AuthService({ db: c.env.DB });
    try {
      const created = await auth.createUser({ email, password, name });

      const JWT_SECRET = c.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return c.json({ error: t("SERVER_MISCONFIGURED"), code: "SERVER_MISCONFIGURED" }, 500);
      }
      const payload = auth.buildJwtPayload(created, COOKIE_MAX_AGE);
      const token = await signJWT(payload, JWT_SECRET);

      // Return token in body for client-side storage (no cookies in Phase 3)
      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const e = toAppError(err, { code: "AUTH_REGISTER_FAILED" });
      // Specialize status for email exists if not provided by service
      const status = e.code === "AUTH_EMAIL_EXISTS" && e.status === 400 ? (409 as const) : e.status;
      return c.json({ error: t(e.code, e.message), code: e.code }, status as any);
    }
  });

  return router;
}
