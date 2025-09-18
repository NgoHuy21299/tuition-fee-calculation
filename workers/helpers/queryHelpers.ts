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

function isQueryLoggingEnabled(meta?: D1Meta): boolean {
  // Allows turning off verbose query logs while keeping expensive logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const disabled = Boolean(g?.DISABLE_D1_QUERY_LOGS);
  return isDev(meta) && !disabled;
}

function formatDatePart(n: number) {
  return String(n).padStart(2, '0');
}

function nowForFileName() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = formatDatePart(d.getMonth() + 1);
  const dd = formatDatePart(d.getDate());
  const hh = formatDatePart(d.getHours());
  const mi = formatDatePart(d.getMinutes());
  const ss = formatDatePart(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function buildLogEntry(tag: string, sql: string, binds: unknown[], meta: D1Meta) {
  return [
    `TAG: ${tag}`,
    `TIME: ${new Date().toISOString()}`,
    `SQL: ${sql}`,
    `BINDS: ${JSON.stringify(binds)}`,
    `META: ${JSON.stringify(meta)}`,
    `------------------------------------------------------------`,
  ].join('\n');
}

function getLogFilePath(kind: 'query' | 'expensive') {
  // Cache one file name per kind for the lifetime of the worker/dev run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const key = kind === 'query' ? '__D1_QUERY_LOG_FILE' : '__D1_EXP_LOG_FILE';
  if (!g[key]) {
    g[key] = `logs/${kind === 'query' ? 'query' : 'expensive-queries'}_${nowForFileName()}.txt`;
  }
  return g[key] as string;
}

async function writeDevLog(kind: 'query' | 'expensive', entry: string) {
  // Prefer a dev hook to write to local FS from the host app.
  // Provide a global hook in your dev harness: globalThis.__writeDevLog({ kind, fileName, content })
  // This avoids trying to access FS from inside Worker runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const fileName = getLogFilePath(kind);
  try {
    if (typeof g.__writeDevLog === 'function') {
      await g.__writeDevLog({ kind, fileName, content: entry + '\n', append: true });
    } else if (typeof g.LOG_SERVER_URL === 'string' && g.LOG_SERVER_URL) {
      // Fallback 2: POST to a local log server (e.g., http://127.0.0.1:3001/log)
      try {
        await fetch(g.LOG_SERVER_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind, fileName, content: entry + '\n', append: true }),
        });
      } catch (e) {
        console.log('[D1 LOG HTTP ERROR]', e);
        console.log(entry);
      }
    } else {
      // Fallback: console output when file logger is not present
      console.log(kind === 'query' ? '[D1 QUERY]' : '[D1 EXPENSIVE]', { fileName });
      console.log(entry);
    }
  } catch (e) {
    console.log('[D1 LOG ERROR]', e);
    console.log(entry);
  }
}

function enforceLimits(tag: string, sql: string, binds: unknown[], meta: D1Meta, limits?: Limits) {
  const rr = meta.rows_read ?? 0;
  const rw = meta.rows_written ?? 0;
  const tooManyReads = limits?.maxRowsRead != null && rr > limits.maxRowsRead;
  const tooManyWrites = limits?.maxRowsWritten != null && rw > limits.maxRowsWritten;
  if (tooManyReads || tooManyWrites) {
    const note = [
      `${tag}: potential expensive query detected`,
      limits?.maxRowsRead != null ? `rows_read=${rr} (max ${limits.maxRowsRead})` : null,
      limits?.maxRowsWritten != null ? `rows_written=${rw} (max ${limits.maxRowsWritten})` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    const entry = `${note}\n${buildLogEntry(tag, sql, binds, meta)}`;
    // Log instead of throw
    void writeDevLog('expensive', entry);
  }
}

async function selectOneWithMeta<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const stmt = db.prepare(sql).bind(...binds);
  const res = await stmt.all<T>();
  const row = (res.results as T[])[0] ?? null;
  const meta = (res.meta || {}) as D1Meta;
  // Default: select-one should not read more than 5 rows
  enforceLimits('SELECT ONE', sql, binds, meta, { maxRowsRead: LIMITS.maxRowsReadForSelectOne, ...(limits || {}) });
  if (isQueryLoggingEnabled(meta)) {
    const entry = buildLogEntry('SELECT ONE', sql, binds, meta);
    void writeDevLog('query', entry);
  }
  return { row, meta };
}

async function selectAllWithMeta<T>(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const stmt = db.prepare(sql).bind(...binds);
  const res = await stmt.all<T>();
  const rows = (res.results as T[]) ?? [];
  const meta = (res.meta || {}) as D1Meta;
  // Default: guard excessive reads; tune as needed
  enforceLimits('SELECT ALL', sql, binds, meta, { maxRowsRead: LIMITS.maxRowsReadForSelectAll, ...(limits || {}) });
  if (isQueryLoggingEnabled(meta)) {
    const entry = buildLogEntry('SELECT ALL', sql, binds, meta) + `\nCOUNT: ${rows.length}\n`;
    void writeDevLog('query', entry);
  }
  return { rows, meta };
}

async function runWithMeta(db: D1, sql: string, binds: unknown[] = [], limits?: Limits) {
  const res = await db.prepare(sql).bind(...binds).run();
  const meta = (res.meta || {}) as D1Meta;
  // Default: writes should be small in typical flows
  enforceLimits('RUN', sql, binds, meta, { maxRowsWritten: LIMITS.maxRowsWritten, ...(limits || {}) });
  if (isQueryLoggingEnabled(meta)) {
    const entry = buildLogEntry('RUN', sql, binds, meta);
    void writeDevLog('query', entry);
  }
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
