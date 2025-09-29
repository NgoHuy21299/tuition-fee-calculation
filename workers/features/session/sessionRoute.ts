import { Hono } from 'hono';
import type { Context } from 'hono';
import { toAppError } from "../../errors";
import { SessionService } from './sessionService';
import {
    CreateSessionSchema,
    CreateSessionSeriesSchema,
    UpdateSessionSchema,
    UnlockSessionSchema
} from './sessionSchemas';
import type { JwtPayload } from '../auth/jwtService';
import { getTeacherId } from '../../middleware/authMiddleware';
import { validateBody, getValidatedData } from '../../middleware/validationMiddleware';
import type { InferOutput } from 'valibot';

export function createSessionRouter() {
    const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload; teacherId: string } }>();

    /**
     * List all sessions for the teacher (for teacher's session management page)
     * GET /api/sessions
     */
    router.get('/', async (c: Context) => {
        try {
            const teacherId = getTeacherId(c);
            const service = new SessionService({ db: c.env.DB });
            const result = await service.listByTeacher(teacherId);
            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Create a single session
     * POST /api/sessions
     */
    router.post('/', validateBody(CreateSessionSchema), async (c: Context) => {
        try {
            const sessionData = getValidatedData<InferOutput<typeof CreateSessionSchema>>(c);
            const teacherId = getTeacherId(c);
            const service = new SessionService({ db: c.env.DB });
            const result = await service.createSession(sessionData, teacherId);
            return c.json(result, 201 as 201);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Unlock a completed session back to scheduled
     * PATCH /api/sessions/:id/unlock
     */
    router.patch('/:id/unlock', validateBody(UnlockSessionSchema), async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const teacherId = getTeacherId(c);
            const { reason } = getValidatedData<{ reason: string }>(c);

            const service = new SessionService({ db: c.env.DB });
            const result = await service.unlockSession(sessionId, reason, teacherId);

            if (!result) {
                return c.json({ error: 'Session not found' }, 404);
            }

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Get a specific session
     * GET /api/sessions/:id
     */
    router.get('/:id', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const teacherId = getTeacherId(c);

            const service = new SessionService({ db: c.env.DB });
            const result = await service.getById(sessionId, teacherId);

            if (!result) {
                return c.json({ error: 'Session not found' }, 404);
            }

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * List upcoming sessions (for dashboard/reminders)
     * GET /api/sessions/upcoming
     */
    router.get('/upcoming', async (c: Context) => {
        try {
            const teacherId = getTeacherId(c);

            const limit = c.req.query('limit');
            const from = c.req.query('from');

            const service = new SessionService({ db: c.env.DB });
            const result = await service.listUpcoming(teacherId, {
                limit: limit ? parseInt(limit, 10) : undefined,
                from: from ?? undefined
            });

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Complete a session
     * PATCH /api/sessions/:id/complete
     */
    router.patch('/:id/complete', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const teacherId = getTeacherId(c);

            const service = new SessionService({ db: c.env.DB });
            const result = await service.completeSession(sessionId, teacherId);

            if (!result) {
                return c.json({ error: 'Session not found' }, 404);
            }

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Create a series of recurring sessions
     * POST /api/sessions/series
     */
    router.post('/series', validateBody(CreateSessionSeriesSchema), async (c: Context) => {
        try {
            const seriesData = getValidatedData<InferOutput<typeof CreateSessionSeriesSchema>>(c);
            const teacherId = getTeacherId(c);
            const service = new SessionService({ db: c.env.DB });
            const result = await service.createSessionSeries(seriesData, teacherId);
            return c.json(result, 201 as 201);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Cancel a session
     * PATCH /api/sessions/:id/cancel
     */
    router.patch('/:id/cancel', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const teacherId = getTeacherId(c);

            const service = new SessionService({ db: c.env.DB });
            const result = await service.cancelSession(sessionId, teacherId);

            if (!result) {
                return c.json({ error: 'Session not found' }, 404);
            }

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Update a session
     * PATCH /api/sessions/:id
     */
    router.patch('/:id', validateBody(UpdateSessionSchema), async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const updateData = getValidatedData<InferOutput<typeof UpdateSessionSchema>>(c);
            const teacherId = getTeacherId(c);
            const service = new SessionService({ db: c.env.DB });
            const result = await service.updateSession(sessionId, updateData, teacherId);

            if (!result) {
                return c.json({ error: 'Session not found' }, 404);
            }

            return c.json(result, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Delete a session
     * DELETE /api/sessions/:id
     */
    router.delete('/:id', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const teacherId = getTeacherId(c);

            const service = new SessionService({ db: c.env.DB });
            await service.deleteSession(sessionId, teacherId);

            return c.json({ success: true }, 200 as 200);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    return router;
}