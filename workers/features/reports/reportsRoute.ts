import { Hono } from 'hono';
import type { Context } from 'hono';
import { toAppError } from "../../errors";
import { ReportsService } from './reportsService';
import { MonthlyReportQuerySchema } from './reportsSchemas';
import type { JwtPayload } from '../auth/jwtService';
import { getTeacherId } from '../../middleware/authMiddleware';
import { validateQuery, getValidatedData } from '../../middleware/validationMiddleware';
import type { InferOutput } from 'valibot';

export function createReportsRouter() {
    const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

    /**
     * Get monthly report for a class
     * GET /api/reports/monthly?classId=xxx&month=2024-09&includeStudentDetails=true&forceRefresh=false
     */
    router.get('/monthly', validateQuery(MonthlyReportQuerySchema), async (c: Context) => {
        try {
            const query = getValidatedData<InferOutput<typeof MonthlyReportQuerySchema>>(c);
            const teacherId = getTeacherId(c);

            const service = new ReportsService({ db: c.env.DB });
            const result = await service.getMonthlyReport({
                classId: query.classId,
                teacherId,
                month: query.month,
                includeStudentDetails: query.includeStudentDetails,
                forceRefresh: query.forceRefresh
            });

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Get monthly report summary (lightweight version)
     * GET /api/reports/monthly/summary?classId=xxx&month=2024-09&forceRefresh=false
     */
    router.get('/monthly/summary', validateQuery(MonthlyReportQuerySchema), async (c: Context) => {
        try {
            const query = getValidatedData<InferOutput<typeof MonthlyReportQuerySchema>>(c);
            const teacherId = getTeacherId(c);

            const service = new ReportsService({ db: c.env.DB });
            const result = await service.getMonthlyReport({
                classId: query.classId,
                teacherId,
                month: query.month,
                includeStudentDetails: false, // Always false for summary
                forceRefresh: query.forceRefresh
            });

            // Return only class info and summary, not detailed student data
            const summary = {
                classInfo: result.classInfo,
                month: result.month,
                summary: result.summary,
                studentCount: result.students.length
            };

            return c.json(summary, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    return router;
}