import {
  ClassRepository,
  ACTIVE_FLAG,
  CLASS_SORT,
  type ClassRow,
  type ClassSort,
} from "../repos/classRepository";
import type {
  CreateClassInput,
  UpdateClassInput,
  ClassDTO,
} from "../types/classTypes";
import { mapClassRowToDTO } from "../types/classTypes";
import { AppError } from "../errors";

export type ClassServiceDeps = { db: D1Database };

export class ClassService {
  private readonly repo: ClassRepository;
  constructor(deps: ClassServiceDeps) {
    this.repo = new ClassRepository({ db: deps.db });
  }

  async listByTeacher(params: {
    teacherId: string;
    isActive?: boolean;
    sort?: ClassSort;
  }): Promise<{ items: ClassDTO[]; total: number }> {
    const { items, total } = await this.repo.listByTeacher(params);
    return { items: items.map(mapClassRowToDTO), total };
  }

  async create(
    teacherId: string,
    input: CreateClassInput & { id: string }
  ): Promise<ClassDTO> {
    await this.repo.create({
      id: input.id,
      teacherId,
      name: input.name,
      subject: input.subject ?? null,
      description: input.description ?? null,
      defaultFeePerSession: input.defaultFeePerSession ?? null,
      isActive: input.isActive ?? true,
    });
    const created = await this.repo.getById(input.id, teacherId);
    if (!created)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Class not found after create",
        404
      );
    return mapClassRowToDTO(created);
  }

  async getById(teacherId: string, id: string): Promise<ClassDTO> {
    const row = await this.repo.getById(id, teacherId);
    if (!row) throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);
    return mapClassRowToDTO(row);
  }

  async update(
    teacherId: string,
    id: string,
    patch: UpdateClassInput
  ): Promise<ClassDTO> {
    const exists = await this.repo.isExistById(id, teacherId);
    if (!exists)
      throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);
    await this.repo.update(id, teacherId, {
      name: patch.name,
      subject: patch.subject ?? null,
      description: patch.description ?? null,
      defaultFeePerSession: patch.defaultFeePerSession ?? null,
      isActive: patch.isActive,
    });
    const updated = await this.repo.getById(id, teacherId);
    if (!updated)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Class not found after update",
        404
      );
    return mapClassRowToDTO(updated);
  }

  async delete(teacherId: string, id: string): Promise<void> {
    const exists = await this.repo.isExistById(id, teacherId);
    if (!exists)
      throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);
    const hasStudents = await this.repo.hasStudents(id);
    if (hasStudents)
      throw new AppError("CLASS_HAS_STUDENTS", "Class has students", 409);
    const hasSessions = await this.repo.hasSessions(id);
    if (hasSessions)
      throw new AppError("CLASS_HAS_SESSIONS", "Class has sessions", 409);
    await this.repo.delete(id, teacherId);
  }
}
