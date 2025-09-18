import client from "../api/client";

// Keep in sync with backend workers/types/classStudentTypes.ts
export type ClassStudentDTO = {
  id: string;
  classId: string;
  studentId: string;
  unitPriceOverride: number | null;
  joinedAt: string; // ISO string
  leftAt: string | null; // ISO string or null
};

export type AddClassStudentInput = {
  studentId: string;
  unitPriceOverride?: number | null;
};

export type LeaveClassStudentInput = {
  leftAt?: string; // optional; backend may default to now
};

export const classStudentService = {
  async addStudentToClass(
    classId: string,
    payload: AddClassStudentInput
  ): Promise<ClassStudentDTO> {
    const { data } = await client.post<ClassStudentDTO>(
      `/api/classes/${encodeURIComponent(classId)}/students`,
      payload
    );
    return data;
  },

  async leaveStudentFromClass(
    classId: string,
    classStudentId: string,
    leftAt?: string
  ): Promise<void> {
    const body: LeaveClassStudentInput = leftAt ? { leftAt } : {};
    await client.put(
      `/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(
        classStudentId
      )}`,
      body
    );
  },
};
