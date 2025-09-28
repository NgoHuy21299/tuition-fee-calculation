import { Hono } from "hono";
import { COOKIE_MAX_AGE } from "../../constants";
import { toAppError } from "../../errors";
import { t } from "../../i18n/errorMessages";
import { ServerEmailValidator } from "../../helpers/serverEmailValidator";
import { signJWT, type JwtPayload } from "./jwtService";
import { validateBody, getValidatedData } from "../../middleware/validationMiddleware";
import { LoginSchema, ChangePasswordSchema, RegisterSchema } from "./authSchemas";
import { AuthService } from "./authService";
import type { InferOutput } from 'valibot';

export function createAuthRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  router.post("/login", validateBody(LoginSchema), async (c) => {
    const parsed = getValidatedData<InferOutput<typeof LoginSchema>>(c);
    const { email, password } = parsed;
    
    // Validate email against allowed hashes
    try {
      await ServerEmailValidator.validateEmailOrThrow(email, c.env);
    } catch (error) {
      return c.json(
        {
          error: t("EMAIL_NOT_ALLOWED"),
          code: "EMAIL_NOT_ALLOWED",
        },
        403 as 403
      );
    }
    
    const auth = new AuthService({ db: c.env.DB });
    const user = await auth.verifyCredentials(email, password);
    if (!user) {
      return c.json(
        {
          error: t("AUTH_INVALID_CREDENTIALS"),
          code: "AUTH_INVALID_CREDENTIALS",
        },
        401 as 401
      );
    }

    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return c.json(
        { error: t("SERVER_MISCONFIGURED"), code: "SERVER_MISCONFIGURED" },
        500 as 500
      );
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
  router.post("/change-password", validateBody(ChangePasswordSchema), async (c) => {
    const parsed = getValidatedData<InferOutput<typeof ChangePasswordSchema>>(c);
    const { oldPassword, newPassword } = parsed;
    const user = c.get("user");
    const userId = (user?.sub as string) || "";
    if (!userId)
      return c.json(
        { error: t("AUTH_UNAUTHORIZED"), code: "AUTH_UNAUTHORIZED" },
        401
      );

    const auth = new AuthService({ db: c.env.DB });
    try {
      await auth.changePassword(userId, oldPassword, newPassword);
      return new Response(null, { status: 204 });
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        e.status as any
      );
    }
  });

  // Register new user and set cookie
  router.post("/register", validateBody(RegisterSchema), async (c) => {
    const parsed = getValidatedData<InferOutput<typeof RegisterSchema>>(c);
    const { email, password, name } = parsed;
    
    // Validate email against allowed hashes
    try {
      await ServerEmailValidator.validateEmailOrThrow(email, c.env);
    } catch (error) {
      return c.json(
        {
          error: t("EMAIL_NOT_ALLOWED"),
          code: "EMAIL_NOT_ALLOWED",
        },
        403 as 403
      );
    }
    
    const auth = new AuthService({ db: c.env.DB });
    try {
      const created = await auth.createUser({ email, password, name });

      const JWT_SECRET = c.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return c.json(
          { error: t("SERVER_MISCONFIGURED"), code: "SERVER_MISCONFIGURED" },
          500
        );
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
      const status =
        e.code === "AUTH_EMAIL_EXISTS" && e.status === 400
          ? (409 as const)
          : e.status;
      return c.json(
        { error: t(e.code, e.message), code: e.code },
        status as any
      );
    }
  });

  return router;
}
