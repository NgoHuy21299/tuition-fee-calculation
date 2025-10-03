import { ClassStudentRepository } from "./classStudentRepository";
import type { ClassStudentDTO } from "./classStudentTypes";
import { mapClassStudentRowToDTO } from "./classStudentTypes";
import { AppError } from "../../errors";
import type {
  AddClassStudentInput,
  LeaveClassStudentInput,
} from "./classStudentSchemas";
import { ClassRepository } from "../class/classRepository";
import { CacheService } from "../../helpers/cacheService";

export type ClassStudentServiceDeps = { db: D1Database; kv?: KVNamespace };

export class ClassStudentService {
  private readonly repo: ClassStudentRepository;
  private readonly classRepo: ClassRepository;
  private readonly cache?: CacheService;

  constructor(private readonly deps: ClassStudentServiceDeps) {
    this.repo = new ClassStudentRepository({ db: deps.db });
    this.classRepo = new ClassRepository({ db: deps.db });
    this.cache = deps.kv ? new CacheService(deps.kv) : undefined;
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
    // Try cache
    let cacheKey: string | undefined;
    if (this.cache) {
      cacheKey = CacheService.buildKey("class-student", "list", {
        classId: params.classId ?? "all",
      });
      const cached = await this.cache.get<{ items: ClassStudentDTO[]; total: number }>(cacheKey);
      if (cached) return cached;
    }

    const rows = await this.repo.listByClass({ classId: params.classId });
    const result = { items: rows.map(mapClassStudentRowToDTO), total: rows.length };

    if (this.cache && cacheKey) {
      await this.cache.set(cacheKey, result, { ttl: 300 });
    }
    return result;
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

    // If not currently a member, check if a historical membership exists
    const existing = await this.repo.getByClassAndStudent({
      classId,
      studentId: input.studentId,
    });

    if (existing) {
      // Reactivate: clear leftAt and optionally update unitPriceOverride
      await this.repo.reactivate({
        id: existing.id,
        unitPriceOverride: input.unitPriceOverride ?? null,
      });
      const rows = await this.repo.listByClass({ classId });
      const updated = rows.find((r) => r.id === existing.id);
      if (!updated)
        throw new AppError(
          "RESOURCE_NOT_FOUND",
          "Membership not found after reactivate",
          404
        );
      const dto = mapClassStudentRowToDTO(updated);
      await this.invalidateListCache(classId);
      return dto;
    } else {
      // Fresh add
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
      const dto = mapClassStudentRowToDTO(created);
      await this.invalidateListCache(classId);
      return dto;
    }
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

    await this.invalidateListCache(classId);
  }

  private async invalidateListCache(classId: string): Promise<void> {
    if (!this.cache) return;
    await this.cache.deleteByPrefix(`class-student:list:classId_${classId}`);
  }
}
