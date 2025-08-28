import { Hono } from "hono";
import { AuthService } from "../services/authService";
import { signJWT, type JwtPayload } from "../services/jwtService";
import { serializeCookie } from "../services/cookiesService";
import { COOKIE_MAX_AGE, COOKIE_NAME } from "../constants";

export function createAuthRouter() {
  const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

  router.post("/login", async (c) => {
    const { email, password } = await c.req.json<{ email: string; password: string }>();
    if (!email || !password) {
      return c.text("Missing credentials", 400);
    }
    const auth = new AuthService({ db: c.env.DB });
    const user = await auth.verifyCredentials(email, password);
    if (!user) {
      return c.text("Invalid email or password", 401);
    }

    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return c.text("Server misconfigured: JWT_SECRET missing", 500);
    }
    const payload = auth.buildJwtPayload(user, COOKIE_MAX_AGE);
    const token = await signJWT(payload, JWT_SECRET);

    const cookie = serializeCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": cookie },
    });
  });

  router.post("/logout", async (c) => {
    const cookie = serializeCookie(COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 0,
    });
    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie } });
  });

  // Change password (requires apiAuthGuard set user variable)
  router.post("/change-password", async (c) => {
    const body = await c.req
      .json<{ oldPassword: string; newPassword: string }>()
      .catch(() => null);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) return c.json({ error: "Missing fields" }, 400);
    if (newPassword.length < 8) return c.json({ error: "Mật khẩu mới phải có ít nhất 8 ký tự" }, 400);

    const user = c.get("user");
    const userId = (user?.sub as string) || "";
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const auth = new AuthService({ db: c.env.DB });
    try {
      await auth.changePassword(userId, oldPassword, newPassword);
      return new Response(null, { status: 204 });
    } catch (err) {
      const msg = (err as Error).message || "Change password failed";
      if (/invalid old password/i.test(msg)) {
        return c.json({ error: "Mật khẩu cũ không đúng" }, 400);
      }
      return c.json({ error: msg }, 400);
    }
  });

  // Register new user and set cookie
  router.post("/register", async (c) => {
    const body = await c.req
      .json<{ email: string; password: string; name?: string }>()
      .catch(() => null);
    if (!body || !body.email || !body.password) {
      return c.text("Missing fields", 400);
    }
    const { email, password, name } = body;
    const auth = new AuthService({ db: c.env.DB });
    try {
      const created = await auth.createUser({ email, password, name });

      const JWT_SECRET = c.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return c.text("Server misconfigured: JWT_SECRET missing", 500);
      }
      const payload = auth.buildJwtPayload(created, COOKIE_MAX_AGE);
      const token = await signJWT(payload, JWT_SECRET);

      const cookie = serializeCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });

      return new Response(null, { status: 204, headers: { "Set-Cookie": cookie } });
    } catch (err) {
      const msg = (err as Error).message || "Registration failed";
      if (/already registered/i.test(msg)) {
        return c.text("Email đã được đăng ký", 409);
      }
      return c.text(msg, 400);
    }
  });

  return router;
}
