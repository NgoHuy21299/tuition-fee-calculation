import { selectAll, selectOne, execute } from "../helpers/queryHelpers";

export type ClassRepoDeps = { db: D1Database };

export type ClassRow = {
  id: string;
  teacherId: string;
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: number; // 0/1 in DB
  createdAt: string;
};

// Consistent enums/consts for sorting and flags
export const CLASS_SORT = {
  CreatedAtDesc: "createdAt_desc",
  CreatedAtAsc: "createdAt_asc",
  NameAsc: "name_asc",
  NameDesc: "name_desc",
} as const;
export type ClassSort = typeof CLASS_SORT[keyof typeof CLASS_SORT];

export const ACTIVE_FLAG = {
  True: 1,
  False: 0,
} as const;

export type ListClassesParams = {
  teacherId: string;
  isActive?: boolean;
  sort?: ClassSort;
};

export class ClassRepository {
  constructor(private readonly deps: ClassRepoDeps) {}

  async listByTeacher(params: ListClassesParams): Promise<{ items: ClassRow[]; total: number }> {
    const where: string[] = ["teacherId = ?"]; 
    const binds: unknown[] = [params.teacherId];

    if (typeof params.isActive === "boolean") {
      where.push("isActive = ?");
      binds.push(params.isActive ? ACTIVE_FLAG.True : ACTIVE_FLAG.False);
    }

    let orderBy = "createdAt DESC";
    switch (params.sort) {
      case CLASS_SORT.CreatedAtAsc:
        orderBy = "createdAt ASC";
        break;
      case CLASS_SORT.NameAsc:
        orderBy = "name ASC";
        break;
      case CLASS_SORT.NameDesc:
        orderBy = "name DESC";
        break;
      default:
        orderBy = "createdAt DESC";
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `
      SELECT id, teacherId, name, subject, description, defaultFeePerSession, isActive, createdAt
      FROM Class
      ${whereSql}
      ORDER BY ${orderBy}
    `;
    const items = await selectAll<ClassRow>(this.deps.db, sql, binds);
    return { items, total: items.length };
  }

  async create(input: {
    id: string;
    teacherId: string;
    name: string;
    subject?: string | null;
    description?: string | null;
    defaultFeePerSession?: number | null;
    isActive?: boolean;
  }): Promise<void> {
    const sql = `
      INSERT INTO Class (id, teacherId, name, subject, description, defaultFeePerSession, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(this.deps.db, sql, [
      input.id,
      input.teacherId,
      input.name,
      input.subject ?? null,
      input.description ?? null,
      input.defaultFeePerSession ?? null,
      input.isActive === false ? ACTIVE_FLAG.False : ACTIVE_FLAG.True,
    ]);
  }

  async getById(id: string, teacherId: string): Promise<ClassRow | null> {
    // Id lookup is indexed by PK; also scope by teacherId (uses idx_class_teacherId)
    const sql = `
      SELECT id, teacherId, name, subject, description, defaultFeePerSession, isActive, createdAt
      FROM Class
      WHERE id = ? AND teacherId = ?
      LIMIT 1
    `;
    const row = await selectOne<ClassRow>(this.deps.db, sql, [id, teacherId]);
    return row ?? null;
  }

  async update(id: string, teacherId: string, patch: Partial<{
    name: string;
    subject: string | null;
    description: string | null;
    defaultFeePerSession: number | null;
    isActive: boolean;
  }>): Promise<void> {
    const sets: string[] = [];
    const binds: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ?");
      binds.push(patch.name);
    }
    if (patch.subject !== undefined) {
      sets.push("subject = ?");
      binds.push(patch.subject);
    }
    if (patch.description !== undefined) {
      sets.push("description = ?");
      binds.push(patch.description);
    }
    if (patch.defaultFeePerSession !== undefined) {
      sets.push("defaultFeePerSession = ?");
      binds.push(patch.defaultFeePerSession);
    }
    if (patch.isActive !== undefined) {
      sets.push("isActive = ?");
      binds.push(patch.isActive ? ACTIVE_FLAG.True : ACTIVE_FLAG.False);
    }

    if (sets.length === 0) return; // nothing to update

    const sql = `UPDATE Class SET ${sets.join(", ")} WHERE id = ? AND teacherId = ?`;
    binds.push(id, teacherId);
    await execute(this.deps.db, sql, binds);
  }

  async delete(id: string, teacherId: string): Promise<void> {
    const sql = `DELETE FROM Class WHERE id = ? AND teacherId = ?`;
    await execute(this.deps.db, sql, [id, teacherId]);
  }

  async hasStudents(classId: string): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM ClassStudent WHERE classId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [classId]);
    return row != null;
  }

  async hasSessions(classId: string): Promise<boolean> {
    const sql = `SELECT 1 AS one FROM Session WHERE classId = ? LIMIT 1`;
    const row = await selectOne<{ one: number }>(this.deps.db, sql, [classId]);
    return row != null;
  }
}
