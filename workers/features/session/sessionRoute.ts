import { Hono } from 'hono';
import type { Context } from 'hono';
import { toAppError } from "../../errors";
import { parseBodyWithSchema } from '../../validation/common/request';
import { SessionService } from './sessionService';
import {
    CreateSessionSchema,
    CreateSessionSeriesSchema,
    UpdateSessionSchema
} from './sessionSchemas';
import type { JwtPayload } from '../auth/jwtService';

export function createSessionRouter() {
    const router = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

    /**
     * Create a single session
     * POST /api/sessions
     */
    router.post('/', async (c: Context) => {
        try {
            const parsed = await parseBodyWithSchema(c, CreateSessionSchema);
            if (!parsed.ok) {
                return c.json(
                    { error: 'Validation error', code: "VALIDATION_ERROR", details: parsed.errors },
                    400 as 400
                );
            }

            const user = c.get("user");
            const teacherId = String(user.sub);
            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

            const service = new SessionService({ db: c.env.DB });
            const result = await service.createSession(parsed.value, teacherId);

            return c.json(result, 201 as 201);
        } catch (err) {
            const e = toAppError(err, { code: "UNKNOWN" });
            return c.json({ error: e.message }, e.status as any);
        }
    });

    /**
     * Create a series of recurring sessions
     * POST /api/sessions/series
     */
    router.post('/series', async (c: Context) => {
        try {
            const parsed = await parseBodyWithSchema(c, CreateSessionSeriesSchema);
            if (!parsed.ok) {
                return c.json(
                    { error: 'Validation error', code: "VALIDATION_ERROR", details: parsed.errors },
                    400 as 400
                );
            }

            const user = c.get("user");
            const teacherId = String(user.sub);
            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

            const service = new SessionService({ db: c.env.DB });
            const result = await service.createSessionSeries(parsed.value, teacherId);

            return c.json(result, 201 as 201);
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
            const user = c.get("user");
            const teacherId = String(user.sub);

            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

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
            const user = c.get("user");
            const teacherId = String(user.sub);

            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

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
     * Cancel a session
     * PATCH /api/sessions/:id/cancel
     */
    router.patch('/:id/cancel', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const user = c.get("user");
            const teacherId = String(user.sub);

            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

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
    router.patch('/:id', async (c: Context) => {
        try {
            const sessionId = c.req.param('id');
            const parsed = await parseBodyWithSchema(c, UpdateSessionSchema);
            if (!parsed.ok) {
                return c.json(
                    { error: 'Validation error', code: "VALIDATION_ERROR", details: parsed.errors },
                    400 as 400
                );
            }

            const user = c.get("user");
            const teacherId = String(user.sub);
            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

            const service = new SessionService({ db: c.env.DB });
            const result = await service.updateSession(sessionId, parsed.value, teacherId);

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
            const user = c.get("user");
            const teacherId = String(user.sub);

            if (!teacherId) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

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