import {
  ClassRepository,
  ACTIVE_FLAG,
  CLASS_SORT,
  type ClassRow,
  type ClassSort,
} from "./classRepository";
import type {
  ClassDTO,
} from "./classTypes";
import { mapClassRowToDTO } from "./classTypes";
import { AppError } from "../../errors";
import type { CreateClassInput, UpdateClassInput } from "./classSchemas";
import { CacheService } from "../../helpers/cacheService";

export type ClassServiceDeps = { 
  db: D1Database;
  kv?: KVNamespace; // Optional for backward compatibility
};

export class ClassService {
  private readonly repo: ClassRepository;
  private readonly cache?: CacheService;
  
  constructor(deps: ClassServiceDeps) {
    this.repo = new ClassRepository({ db: deps.db });
    this.cache = deps.kv ? new CacheService(deps.kv) : undefined;
  }
  
  async listByTeacher(params: {
    teacherId: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<{ items: ClassDTO[]; total: number }> {
    // Try to get from cache if available
    if (this.cache) {
      const cacheKey = CacheService.buildKey("class", "list", {
        teacherId: params.teacherId,
        isActive: params.isActive,
        limit: params.limit,
      });
      
      const cached = await this.cache.get<{ items: ClassDTO[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Fetch from database
    const { items, total } = await this.repo.listByTeacher(params);
    const result = { items: items.map(mapClassRowToDTO), total };
    
    // Store in cache if available (TTL: 5 minutes)
    if (this.cache) {
      const cacheKey = CacheService.buildKey("class", "list", {
        teacherId: params.teacherId,
        isActive: params.isActive,
        limit: params.limit,
      });
      await this.cache.set(cacheKey, result, { ttl: 300 });
    }
    
    return result;
  }

  /**
   * Invalidate all list caches for a teacher
   */
  private async invalidateListCache(teacherId: string): Promise<void> {
    if (this.cache) {
      // Invalidate all list cache entries for this teacher
      await this.cache.deleteByPrefix(`class:list:teacherId_${teacherId}`);
    }
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
    
    // Invalidate list cache
    await this.invalidateListCache(teacherId);
    
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
    // IMPORTANT: Do NOT coalesce undefined to null here.
    // Only pass fields that were explicitly provided by the client.
    await this.repo.update(id, teacherId, {
      name: patch.name,
      subject: patch.subject, // keep undefined if not provided; repo will ignore
      description: patch.description,
      defaultFeePerSession: patch.defaultFeePerSession,
      isActive: patch.isActive,
    });
    const updated = await this.repo.getById(id, teacherId);
    if (!updated)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Class not found after update",
        404
      );
    
    // Invalidate list cache
    await this.invalidateListCache(teacherId);
    
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
    
    // Invalidate list cache
    await this.invalidateListCache(teacherId);
  }
}
