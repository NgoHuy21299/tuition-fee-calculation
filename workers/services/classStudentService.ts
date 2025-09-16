import { ClassStudentRepository } from "../repos/classStudentRepository";
import { ClassRepository } from "../repos/classRepository";
import type { ClassStudentDTO } from "../types/classStudentTypes";
import { mapClassStudentRowToDTO } from "../types/classStudentTypes";
import { AppError } from "../errors";
import type {
  AddClassStudentInput,
  LeaveClassStudentInput,
} from "workers/validation/classStudent/classStudentSchemas";

export type ClassStudentServiceDeps = { db: D1Database };

export class ClassStudentService {
  private readonly repo: ClassStudentRepository;
  private readonly classRepo: ClassRepository;

  constructor(private readonly deps: ClassStudentServiceDeps) {
    this.repo = new ClassStudentRepository({ db: deps.db });
    this.classRepo = new ClassRepository({ db: deps.db });
  }

  /**
   * List memberships for a class or all classes (when classId is null).
   */
  async listByClass(
    teacherId: string,
    params: { classId: string | null }
  ): Promise<{ items: ClassStudentDTO[]; total: number }> {
    if (params.classId) {
      const exists = await this.classRepo.isExistById(
        params.classId,
        teacherId
      );
      if (!exists)
        throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);
    }
    const rows = await this.repo.listByClass({ classId: params.classId });
    return { items: rows.map(mapClassStudentRowToDTO), total: rows.length };
  }

  /**
   * Add a student to a class. Only class owner can perform this.
   * Enforces UNIQUE(classId, studentId).
   */
  async add(
    teacherId: string,
    classId: string,
    input: AddClassStudentInput & { id: string }
  ): Promise<ClassStudentDTO> {
    const exists = await this.classRepo.isExistById(classId, teacherId);
    if (!exists)
      throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);

    const alreadyMember = await this.repo.isMember({
      classId,
      studentId: input.studentId,
    });

    if (alreadyMember)
      throw new AppError("ALREADY_MEMBER", "Student already in class", 409);

    await this.repo.add({
      id: input.id,
      classId,
      studentId: input.studentId,
      unitPriceOverride: input.unitPriceOverride ?? null,
    });

    const rows = await this.repo.listByClass({ classId });
    const created = rows.find((r) => r.id === input.id);
    if (!created)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Membership not found after add",
        404
      );
    return mapClassStudentRowToDTO(created);
  }

  /**
   * Leave a class (set leftAt). Only class owner can perform this.
   */
  async leave(
    teacherId: string,
    classId: string,
    classStudentId: string,
    input: LeaveClassStudentInput
  ): Promise<void> {
    const exists = await this.classRepo.isExistById(classId, teacherId);
    if (!exists)
      throw new AppError("RESOURCE_NOT_FOUND", "Class not found", 404);

    const leftAt = input.leftAt ?? new Date().toISOString();
    await this.repo.leave({ classStudentId, leftAt });
  }
}
