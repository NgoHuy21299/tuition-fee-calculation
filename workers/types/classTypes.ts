import type { ClassRow } from "../repos/classRepository";
import type {
  CreateClassInput as SchemaCreateClassInput,
  UpdateClassInput as SchemaUpdateClassInput,
} from "../validation/class/classSchemas";

// OUTPUT DTO: dữ liệu trả về cho client khi thao tác với Class
export type ClassDTO = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: boolean;
  createdAt: string; // ISO text from DB
};

// INPUT DTO: lấy trực tiếp từ Valibot schema (single source of truth)
export type CreateClassInput = SchemaCreateClassInput;
export type UpdateClassInput = SchemaUpdateClassInput;

// Helpers for flag mapping
export function dbFlagToBool(n: number): boolean {
  return n === 1;
}
export function boolToDbFlag(b: boolean | undefined): number | null {
  if (b === undefined) return null;
  return b ? 1 : 0;
}

// Map DB row -> DTO
export function mapClassRowToDTO(row: ClassRow): ClassDTO {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    description: row.description,
    defaultFeePerSession: row.defaultFeePerSession,
    isActive: dbFlagToBool(row.isActive),
    createdAt: row.createdAt,
  };
}
