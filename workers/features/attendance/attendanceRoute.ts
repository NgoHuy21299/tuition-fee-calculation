import { Hono } from "hono";
import type { Context } from "hono";
import { toAppError } from "../../errors";
import { AttendanceService } from "./attendanceService";
import {
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  BulkAttendanceSchema,
  AttendanceQuerySchema,
} from "./attendanceSchemas";
import type { JwtPayload } from "../auth/jwtService";
import { getTeacherId } from "../../middleware/authMiddleware";
import {
  validateBody,
  getValidatedData,
} from "../../middleware/validationMiddleware";
import type { InferOutput } from "valibot";

export function createAttendanceRouter() {
  const router = new Hono<{
    Bindings: Env;
    Variables: { user: JwtPayload; teacherId: string };
  }>();

  /**
   * Get attendance list for a session with student info
   * GET /api/sessions/:sessionId/attendance
   */
  router.get("/sessions/:sessionId/attendance", async (c: Context) => {
    try {
      const sessionId = c.req.param("sessionId");
      const teacherId = getTeacherId(c);
      const service = new AttendanceService({ db: c.env.DB });

      const result = await service.getSessionAttendance({
        sessionId,
        teacherId,
      });
      return c.json(result);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: e.message }, e.status as any);
    }
  });

  /**
   * Bulk create/update attendance records for a session
   * POST /api/sessions/:sessionId/attendance
   */
  router.post(
    "/sessions/:sessionId/attendance",
    validateBody(BulkAttendanceSchema),
    async (c: Context) => {
      try {
        const sessionId = c.req.param("sessionId");
        const bulkData =
          getValidatedData<InferOutput<typeof BulkAttendanceSchema>>(c);
        const teacherId = getTeacherId(c);
        const service = new AttendanceService({ db: c.env.DB });

        // Validate sessionId matches the one in the body
        if (bulkData.sessionId !== sessionId) {
          return c.json({ error: "Session ID mismatch" }, 400);
        }

        const result = await service.markAttendance({
          sessionId,
          attendanceRecords: bulkData.attendanceRecords,
          teacherId,
        });

        return c.json(result, result.success ? 200 : 207); // 207 for partial success
      } catch (err) {
        const e = toAppError(err, { code: "UNKNOWN" });
        return c.json({ error: e.message }, e.status as any);
      }
    }
  );

  /**
   * Update individual attendance record
   * PUT /api/attendance/:id
   */
  router.put(
    "/attendance/:id",
    validateBody(UpdateAttendanceSchema),
    async (c: Context) => {
      try {
        const attendanceId = c.req.param("id");
        const updateData =
          getValidatedData<InferOutput<typeof UpdateAttendanceSchema>>(c);
        const teacherId = getTeacherId(c);
        const service = new AttendanceService({ db: c.env.DB });

        const result = await service.updateAttendance({
          id: attendanceId,
          updates: updateData,
          teacherId,
        });

        return c.json(result);
      } catch (err) {
        const e = toAppError(err, { code: "UNKNOWN" });
        return c.json({ error: e.message }, e.status as any);
      }
    }
  );

  /**
   * Delete attendance record
   * DELETE /api/attendance/:id
   */
  router.delete("/attendance/:id", async (c: Context) => {
    try {
      const attendanceId = c.req.param("id");
      const teacherId = getTeacherId(c);
      const service = new AttendanceService({ db: c.env.DB });

      await service.deleteAttendance({
        id: attendanceId,
        teacherId,
      });

      return c.json({ success: true }, 200);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: e.message }, e.status as any);
    }
  });

  /**
   * Get attendance history for a student
   * GET /api/students/:studentId/attendance
   */
  router.get("/students/:studentId/attendance", async (c: Context) => {
    try {
      const studentId = c.req.param("studentId");
      const query = c.req.query();
      const filters = {
        classId: query.classId,
        fromDate: query.fromDate,
        toDate: query.toDate,
        status: query.status as "present" | "absent" | "late" | undefined,
      };
      const teacherId = getTeacherId(c);
      const service = new AttendanceService({ db: c.env.DB });

      const result = await service.getStudentAttendanceHistory({
        studentId,
        teacherId,
        filters,
      });

      return c.json(result);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: e.message }, e.status as any);
    }
  });

  /**
   * Calculate fees for all students in a session
   * GET /api/sessions/:sessionId/fees
   */
  router.get("/sessions/:sessionId/fees", async (c: Context) => {
    try {
      const sessionId = c.req.param("sessionId");
      const teacherId = getTeacherId(c);
      const service = new AttendanceService({ db: c.env.DB });

      const result = await service.calculateSessionFees({
        sessionId,
        teacherId,
      });
      return c.json(result);
    } catch (err) {
      const e = toAppError(err, { code: "UNKNOWN" });
      return c.json({ error: e.message }, e.status as any);
    }
  });

  /**
   * Create individual attendance record
   * POST /api/attendance
   */
  router.post(
    "/attendance",
    validateBody(CreateAttendanceSchema),
    async (c: Context) => {
      try {
        const attendanceData =
          getValidatedData<InferOutput<typeof CreateAttendanceSchema>>(c);
        const teacherId = getTeacherId(c);
        const service = new AttendanceService({ db: c.env.DB });

        // Use bulk operation with single record for consistency
        const result = await service.markAttendance({
          sessionId: attendanceData.sessionId,
          attendanceRecords: [
            {
              studentId: attendanceData.studentId,
              status: attendanceData.status,
              note: attendanceData.note,
              feeOverride: attendanceData.feeOverride,
            },
          ],
          teacherId,
        });

        if (result.success && result.results.length > 0) {
          // Get the created attendance record
          const createdResult = result.results[0];
          if (createdResult.success && createdResult.attendanceId) {
            // Return the attendance list for the session to get full info
            const sessionAttendance = await service.getSessionAttendance({
              sessionId: attendanceData.sessionId,
              teacherId,
            });

            const createdAttendance = sessionAttendance.find(
              (a) => a.id === createdResult.attendanceId
            );
            return c.json(createdAttendance, 201);
          }
        }

        return c.json({ error: "Failed to create attendance record" }, 500);
      } catch (err) {
        const e = toAppError(err, { code: "UNKNOWN" });
        return c.json({ error: e.message }, e.status as any);
      }
    }
  );

  return router;
}
