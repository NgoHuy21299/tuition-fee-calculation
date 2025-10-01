import { Hono } from "hono";
import type { JwtPayload } from "./features/auth/jwtService";
import { apiAuthGuard } from "./middleware/authMiddleware";
import { createHealthRouter } from "./routes/healthRoute";
import { createClassRouter } from "./features/class/classRoute";
import { createStudentRouter } from "./features/student/studentRoute";
import { createAuthRouter } from "./features/auth/authRoute";
import { createClassStudentRouter } from "./features/class-student/classStudentRoute";
import { createSessionRouter } from "./features/session/sessionRoute";
import { createAttendanceRouter } from "./features/attendance/attendanceRoute";
import { createReportsRouter } from "./features/reports/reportsRoute";

const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// --- CORS middleware (Phase 3: token-based auth) ---
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin") || "*";
  await next();
  if (!c.res) return; // no response to decorate
  const headers = new Headers(c.res.headers);
  headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  c.res = new Response(c.res.body, { status: c.res.status, headers });
});

// Handle OPTIONS preflight early
app.options("*", (c) => {
  const origin = c.req.header("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// --- Middleware for /api/* ---
app.use("/api/*", apiAuthGuard);

// --- Auth routes ---
app.route("/api/auth", createAuthRouter());

// --- Health routes ---
app.route("/api", createHealthRouter());

// --- Classes routes ---
app.route("/api/classes", createClassRouter());

// --- Students routes ---
app.route("/api/students", createStudentRouter());

// --- Class membership routes (students in classes) ---
// Note: Mounted at the same base "/api/classes" to expose endpoints like
// POST /api/classes/:id/students and DELETE/PUT for membership management.
app.route("/api/classes", createClassStudentRouter());

// --- Session routes ---
app.route("/api/sessions", createSessionRouter());

// --- Attendance routes ---
app.route("/api", createAttendanceRouter());

// --- Reports routes ---
app.route("/api/reports", createReportsRouter());

// --- Silence Chrome DevTools probe route ---
app.get("/.well-known/appspecific/com.chrome.devtools.json", (c) => {
  return new Response(null, { status: 204 });
});

// Optional: respond at root with a simple message so the Worker isn't empty
app.get("/", (c) => c.text("OK: API is running."));

export default app;
