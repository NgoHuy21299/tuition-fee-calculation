import client from "../api/client";
import { toQueryString } from "../utils/paramUtils";

// Keep in sync with backend workers/types/classTypes.ts
export type ClassDTO = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  defaultFeePerSession: number | null;
  isActive: boolean;
  createdAt: string; // ISO string
};

export type ListClassesParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
  // Free-form sort matches backend accepted sort value, e.g. "createdAt:desc"
  sort?: string;
};

export type ListClassesResponse = {
  items: ClassDTO[];
  total: number;
};

export type CreateClassInput = {
  name: string;
  subject?: string | null;
  description?: string | null;
  defaultFeePerSession?: number | null;
  isActive?: boolean; // default true on backend
};

export type UpdateClassInput = Partial<CreateClassInput>;

export const classService = {
  async listClasses(params: ListClassesParams = {}): Promise<ListClassesResponse> {
    const qs = toQueryString(params);
    const { data } = await client.get<ListClassesResponse>(`/api/classes${qs}`);
    return data;
  },

  async createClass(payload: CreateClassInput): Promise<ClassDTO> {
    const { data } = await client.post<ClassDTO>("/api/classes", payload);
    return data;
  },

  async getClass(id: string): Promise<ClassDTO> {
    const { data } = await client.get<ClassDTO>(`/api/classes/${encodeURIComponent(id)}`);
    return data;
  },

  async updateClass(id: string, patch: UpdateClassInput): Promise<ClassDTO> {
    const { data } = await client.put<ClassDTO>(`/api/classes/${encodeURIComponent(id)}`, patch);
    return data;
  },

  async deleteClass(id: string): Promise<void> {
    await client.delete(`/api/classes/${encodeURIComponent(id)}`);
  },
};
