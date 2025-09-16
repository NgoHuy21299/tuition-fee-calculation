import type { StudentRow } from "../repos/studentRepository";

// OUTPUT DTO: dữ liệu trả về cho client khi thao tác với Student
export type StudentDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: string; // ISO text from DB
  // Display-only parent info (không trả parentId ra ngoài API theo plan)
  parentName?: string | null;
  parentPhone?: string | null;
};

export function mapStudentRowToDTO(row: StudentRow): StudentDTO {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    note: row.note,
    createdAt: row.createdAt,
    parentName: row.parentName ?? null,
    parentPhone: row.parentPhone ?? null,
  };
}
