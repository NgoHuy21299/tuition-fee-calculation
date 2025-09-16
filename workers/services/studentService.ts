import { StudentRepository } from "../repos/studentRepository";
import { ParentRepository } from "../repos/parentRepository";
import { mapStudentRowToDTO, mapStudentDetailToDTO, type StudentDTO, type StudentDetailDTO } from "../types/studentTypes";
import { AppError } from "../errors";
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "workers/validation/student/studentSchemas";

export type StudentServiceDeps = { db: D1Database };

const REL_PREFIX: Record<
  "father" | "mother" | "grandfather" | "grandmother",
  string
> = {
  father: "Bố",
  mother: "Mẹ",
  grandfather: "Ông",
  grandmother: "Bà",
};

export class StudentService {
  private readonly repo: StudentRepository;
  private readonly parentRepo: ParentRepository;
  constructor(private readonly deps: StudentServiceDeps) {
    this.repo = new StudentRepository({ db: deps.db });
    this.parentRepo = new ParentRepository({ db: deps.db });
  }

  async listByTeacher(params: {
    teacherId: string;
    classId?: string;
  }): Promise<{ items: StudentDTO[]; total: number }> {
    const rows = await this.repo.listByTeacher({
      teacherId: params.teacherId,
      classId: params.classId,
    });
    return { items: rows.map(mapStudentRowToDTO), total: rows.length };
  }

  async getDetailById(teacherId: string, id: string): Promise<StudentDetailDTO> {
    const detail = await this.repo.getDetailById(id, teacherId);
    if (!detail) throw new AppError("RESOURCE_NOT_FOUND", "Student not found", 404);
    return mapStudentDetailToDTO(detail);
  }

  async create(
    teacherId: string,
    input: CreateStudentInput & { id: string }
  ): Promise<StudentDTO> {
    // Duplicate check (simple policy per plan)
    const isDup = await this.repo.existsDuplicate({
      teacherId,
      name: input.name,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
    });
    if (isDup)
      throw new AppError(
        "DUPLICATE_STUDENT",
        "Duplicate student (name/phone/email)",
        409
      );

    // Handle inline parent creation (optional)
    let parentIdInternal: string | null = null;
    if (input.parentInline) {
      const rel = input.parentInline.relationship;
      let parentName = (input.parentInline.name ?? "").trim();
      if (!parentName) {
        const prefix = REL_PREFIX[rel];
        parentName = `${prefix} ${input.name}`;
      }
      parentIdInternal = crypto.randomUUID();
      await this.parentRepo.create({
        id: parentIdInternal,
        name: parentName,
        phone: input.parentInline.phone ?? null,
        email: input.parentInline.email ?? null,
        note: input.parentInline.note ?? null,
      });
    }

    // Create student
    await this.repo.create({
      id: input.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      note: input.note ?? null,
      parentIdInternal,
      createdByTeacher: teacherId,
    });

    const created = await this.repo.getById(input.id, teacherId);
    if (!created)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Student not found after create",
        404
      );
    return mapStudentRowToDTO(created);
  }

  async update(
    teacherId: string,
    id: string,
    patch: UpdateStudentInput
  ): Promise<StudentDTO> {
    // Disallow updates that would create duplicates
    if ((patch.email ?? patch.phone ?? patch.name) !== undefined) {
      const dup = await this.repo.existsDuplicate({
        teacherId,
        name: patch.name ?? "",
        phone: patch.phone ?? undefined,
        email: patch.email ?? undefined,
      });
      if (dup)
        throw new AppError(
          "DUPLICATE_STUDENT",
          "Duplicate student (name/phone/email)",
          409
        );
    }
    await this.repo.update(id, teacherId, {
      name: patch.name,
      email: patch.email ?? undefined,
      phone: patch.phone ?? undefined,
      note: patch.note ?? undefined,
    });
    const updated = await this.repo.getById(id, teacherId);
    if (!updated)
      throw new AppError(
        "RESOURCE_NOT_FOUND",
        "Student not found after update",
        404
      );
    return mapStudentRowToDTO(updated);
  }

  async delete(teacherId: string, id: string): Promise<void> {
    await this.repo.delete(id, teacherId);
  }
}
