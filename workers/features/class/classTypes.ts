import { dbFlagToBool } from "../../helpers/mappingHeplers";
import type { ClassRow } from "./classRepository";

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
