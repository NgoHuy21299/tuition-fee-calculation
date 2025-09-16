import type { ClassStudentRow } from "../repos/classStudentRepository";

// OUTPUT DTO: dữ liệu trả về cho client khi thao tác membership Class-Student
export type ClassStudentDTO = {
  id: string;
  classId: string;
  studentId: string;
  unitPriceOverride: number | null;
  joinedAt: string;
  leftAt: string | null;
};

export function mapClassStudentRowToDTO(row: ClassStudentRow): ClassStudentDTO {
  return {
    id: row.id,
    classId: row.classId,
    studentId: row.studentId,
    unitPriceOverride: row.unitPriceOverride,
    joinedAt: row.joinedAt,
    leftAt: row.leftAt,
  };
}
