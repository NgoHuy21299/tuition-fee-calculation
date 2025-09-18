import client from "../api/client";
import type { Relationship } from "../components/students/StudentForm";
import { toQueryString } from "../utils/paramUtils";

// Keep in sync with backend workers/types/studentTypes.ts (DTOs section in docs 3.0)
export type StudentDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: string; // ISO string
  currentClasses?: string | null;
};

export type ParentDTO = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  relationship: Relationship | null;
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

export type ListStudentsParams = {
  classId?: string;
};

export type ListStudentsResponse = {
  items: StudentDTO[];
  total: number;
};

export type ParentInlineInput = {
  relationship: "father" | "mother" | "grandfather" | "grandmother";
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

export type CreateStudentInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  parents?: ParentInlineInput[] | null;
};

export type UpdateStudentInput = Partial<CreateStudentInput>;

export const studentService = {
  async listStudents(
    params: ListStudentsParams = {}
  ): Promise<ListStudentsResponse> {
    const qs = toQueryString(params);
    const { data } = await client.get<ListStudentsResponse>(
      `/api/students${qs}`
    );
    return data;
  },

  async createStudent(payload: CreateStudentInput): Promise<StudentDTO> {
    const { data } = await client.post<StudentDTO>("/api/students", payload);
    return data;
  },

  async getStudent(id: string): Promise<StudentDetailDTO> {
    const { data } = await client.get<StudentDetailDTO>(
      `/api/students/${encodeURIComponent(id)}`
    );
    return data;
  },

  async updateStudent(
    id: string,
    patch: UpdateStudentInput
  ): Promise<StudentDTO> {
    const { data } = await client.put<StudentDTO>(
      `/api/students/${encodeURIComponent(id)}`,
      patch
    );
    return data;
  },

  async deleteStudent(id: string): Promise<void> {
    await client.delete(`/api/students/${encodeURIComponent(id)}`);
  },
};
