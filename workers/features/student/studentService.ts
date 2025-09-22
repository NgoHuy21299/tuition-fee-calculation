import { StudentRepository } from "./studentRepository";
import { ParentRepository } from "./parentRepository";
import { ClassStudentRepository } from "../class-student/classStudentRepository";
import { AttendanceRepository } from "./attendanceRepository";
import { mapStudentRowToDTO, mapStudentDetailToDTO, type StudentDTO, type StudentDetailDTO } from "./studentTypes";
import { AppError } from "../../errors";
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "./studentSchemas";
import { uuidv7 } from "uuidv7";

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
  private readonly classStudentRepo: ClassStudentRepository;
  private readonly attendanceRepo: AttendanceRepository;
  constructor(private readonly deps: StudentServiceDeps) {
    this.repo = new StudentRepository({ db: deps.db });
    this.parentRepo = new ParentRepository({ db: deps.db });
    this.classStudentRepo = new ClassStudentRepository({ db: deps.db });
    this.attendanceRepo = new AttendanceRepository({ db: deps.db });
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

    if (input.parents && input.parents.length > 0) {
      // Tạo nhiều parents cùng lúc
      const parentInputs = input.parents.map(parent => {
        const rel = parent.relationship;
        let parentName = (parent.name ?? "").trim();
        if (!parentName) {
          const prefix = REL_PREFIX[rel];
          parentName = `${prefix} ${input.name}`;
        }
        return {
          id: uuidv7(),
          studentId: input.id, // ID của student
          name: parentName,
          phone: parent.phone ?? null,
          email: parent.email ?? null,
          note: parent.note ?? null,
          relationship: parent.relationship,
        };
      });
      
      await this.parentRepo.bulkCreate(parentInputs);
    }

    // Create student
    await this.repo.create({
      id: input.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      note: input.note ?? null,
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
    // Handle parents update (optional)
    if (patch.parents !== undefined) {
      // 1. Lấy ra các parents của student hiện tại
      const currentParents = await this.parentRepo.getByStudentId(id);
      
      // 2. Tạo map để dễ tìm kiếm
      const currentParentMap = new Map(currentParents.map(p => [p.id, p]));
      const patchParents = patch.parents || [];
      const patchParentMap = new Map(patchParents.map((p: any) => [p.id, p]));
      
      // 3. So sánh và xử lý từng parent
      // 3.1. Nếu parent db đã tồn tại thì update
      for (const patchParent of patchParents) {
        if (patchParent.id && currentParentMap.has(patchParent.id)) {
          // Update parent nếu có sự thay đổi
          const currentParent = currentParentMap.get(patchParent.id);
          if (
            currentParent &&
            (currentParent.name !== (patchParent.name ?? null) ||
              currentParent.phone !== (patchParent.phone ?? null) ||
              currentParent.email !== (patchParent.email ?? null) ||
              currentParent.note !== (patchParent.note ?? null))
          ) {
            await this.parentRepo.update({
              id: patchParent.id,
              studentId: id,
              name: patchParent.name ?? "",
              phone: patchParent.phone ?? null,
              email: patchParent.email ?? null,
              note: patchParent.note ?? null,
              relationship: patchParent.relationship ?? null,
            });
          }
        }
      }
      
      // 3.2. Nếu parent db chưa tồn tại thì create
      const newParents = patchParents.filter((p: any) => !currentParentMap.has(p.id));
      if (newParents.length > 0) {
        const parentInputs = newParents.map((parent: any) => {
          let parentName = (parent.name ?? "").trim();
          if (!parentName) {
            // Note: REL_PREFIX không được định nghĩa trong update context
            // Trong thực tế bạn có thể muốn truyền tên parent từ client
            parentName = parent.name ?? "";
          }
          return {
            id: parent.id,
            studentId: id,
            name: parentName,
            phone: parent.phone ?? null,
            email: parent.email ?? null,
            note: parent.note ?? null,
            relationship: parent.relationship ?? null,
          };
        });
        await this.parentRepo.bulkCreate(parentInputs);
      }
      
      // 3.3. Nếu parent db tồn tại nhưng parent api truyền vào không còn nữa thì delete
      const deletedParents = currentParents.filter(p => !patchParentMap.has(p.id));
      for (const deletedParent of deletedParents) {
        await this.parentRepo.delete(deletedParent.id);
      }
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
    // Ownership check (authorization)
    const isOwner = await this.repo.isOwner(id, teacherId);
    if (!isOwner) {
      throw new AppError("FORBIDDEN", "Dont have permission!", 400);
    }

    // Business rules
    const hasMembershipEver = await this.classStudentRepo.hasAnyMembership({
      studentId: id,
    });
    if (hasMembershipEver) {
      throw new AppError(
        "STUDENT_HAS_MEMBERSHIP_HISTORY",
        "Student has membership history, cannot remove",
        409,
      );
    }

    const hasAttendance = await this.attendanceRepo.hasAnyAttendance({
      studentId: id,
    });
    if (hasAttendance) {
      throw new AppError(
        "STUDENT_HAS_ATTENDANCE",
        "Student has membership history, cannot remove",
        409,
      );
    }

    await this.repo.delete(id, teacherId);
  }
}
