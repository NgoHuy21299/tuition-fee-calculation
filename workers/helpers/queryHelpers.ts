type D1 = D1Database;

// Lightweight type for D1 meta we care about
type D1Meta = {
  served_by?: string;
  duration?: number;
  changes?: number;
  last_row_id?: number;
  changed_db?: boolean;
  size_after?: number;
  rows_read?: number;
  rows_written?: number;
};

type Limits = {
  maxRowsRead?: number; // throw if rows_read exceeds
  maxRowsWritten?: number; // throw if rows_written exceeds
};

const LIMITS = {
  maxRowsReadForSelectOne: 10,
  maxRowsReadForSelectAll: 100,
  maxRowsWritten: 10,
}

function isDev(meta?: D1Meta): boolean {
  // Prefer meta.served_by heuristic (miniflare)
  if (meta?.served_by && /miniflare/i.test(meta.served_by)) return true;
  // Allow global switch e.g. globalThis.__DEV__ = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  return Boolean(g?.__DEV__ || g?.DEBUG_D1_LOG);
}

function enforceLimits(tag: string, sql: string, binds: unknown[], meta: D1Meta, limits?: Limits) {
  const rr = meta.rows_read ?? 0;
  const rw = meta.rows_written ?? 0;
  if (limits?.maxRowsRead != null && rr > limits.maxRowsRead) {
    throw new Error(
      `[D1 LIMIT] ${tag}: rows_read ${rr} exceeded max ${limits.maxRowsRead}. SQL=${sql} binds=${JSON.stringify(
        binds,
      )}`,
    );
  }
  if (limits?.maxRowsWritten != null && rw > limits.maxRowsWritten) {
    throw new Error(
      `[D1 LIMIT] ${tag}: rows_written ${rw} exceeded max ${limits.maxRowsWritten}. SQL=${sql} binds=${JSON.stringify(
        binds,
      )}`,
    );
  }
}

async function selectOneWithMeta<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const stmt = db.prepare(sql).bind(...binds);
  const res = await stmt.all<T>();
  const row = (res.results as T[])[0] ?? null;
  const meta = (res.meta || {}) as D1Meta;
  // Default: select-one should not read more than 5 rows
  enforceLimits('SELECT ONE', sql, binds, meta, { maxRowsRead: LIMITS.maxRowsReadForSelectOne, ...(limits || {}) });
  if (isDev(meta)) console.log('[D1 SELECT ONE]', { sql, binds, meta });
  return { row, meta };
}

async function selectAllWithMeta<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const stmt = db.prepare(sql).bind(...binds);
  const res = await stmt.all<T>();
  const rows = (res.results as T[]) ?? [];
  const meta = (res.meta || {}) as D1Meta;
  // Default: guard excessive reads; tune as needed
  enforceLimits('SELECT ALL', sql, binds, meta, { maxRowsRead: LIMITS.maxRowsReadForSelectAll, ...(limits || {}) });
  if (isDev(meta)) console.log('[D1 SELECT ALL]', { sql, binds, count: rows.length, meta });
  return { rows, meta };
}

async function runWithMeta(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const res = await db.prepare(sql).bind(...binds).run();
  const meta = (res.meta || {}) as D1Meta;
  // Default: writes should be small in typical flows
  enforceLimits('RUN', sql, binds, meta, { maxRowsWritten: LIMITS.maxRowsWritten, ...(limits || {}) });
  if (isDev(meta)) console.log('[D1 RUN]', { sql, binds, meta });
  return meta;
}

// Convenience helpers (discard meta)
export async function selectOne<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const { row } = await selectOneWithMeta<T>(db, sql, binds, limits);
  return row;
}

export async function selectAll<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const { rows } = await selectAllWithMeta<T>(db, sql, binds, limits);
  return rows;
}

export async function execute(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  await runWithMeta(db, sql, binds, limits);
}
