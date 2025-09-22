import type { StudentRow, StudentDetail } from "./studentRepository";
import { dbFlagToBool } from "../../helpers/mappingHeplers";

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
  // Concatenated current classes (leftAt IS NULL), comma-separated
  currentClasses?: string | null;
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
    currentClasses: row.currentClasses ?? null,
  };
}

// Additional DTOs for detail view
export type ParentDTO = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  relationship: string | null;
};

export type ClassWithMembershipDTO = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: boolean;
  createdAt: string;
  classStudentId: string;
  joinedAt: string;
  leftAt: string | null;
  unitPriceOverride: number | null;
};

export type StudentDetailDTO = {
  student: StudentDTO;
  parents: ParentDTO[];
  classes: ClassWithMembershipDTO[];
};

export function mapStudentDetailToDTO(detail: StudentDetail): StudentDetailDTO {
  const student = mapStudentRowToDTO(detail.student);
  const parents: ParentDTO[] = detail.parents
    ? detail.parents.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        note: c.note,
        relationship: c.relationship ?? null,
      }))
    : [];
  const classes: ClassWithMembershipDTO[] = detail.classes
    ? detail.classes.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        description: c.description,
        defaultFeePerSession: c.defaultFeePerSession,
        isActive: dbFlagToBool(c.isActive),
        createdAt: c.createdAt,
        classStudentId: c.classStudentId,
        joinedAt: c.joinedAt,
        leftAt: c.leftAt,
        unitPriceOverride: c.unitPriceOverride,
      }))
    : [];
  return { student, parents, classes };
}
