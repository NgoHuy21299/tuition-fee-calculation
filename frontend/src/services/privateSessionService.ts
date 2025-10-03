import apiClient from '../api/client';
import type { SessionType } from '../constants';
import type { SessionDto } from './sessionService';

export interface CreatePrivateSessionRequest {
  studentIds: string[];
  startTime: string;
  durationMin: number;
  feePerSession: number;
  notes?: string | null;
  status?: 'scheduled' | 'completed' | 'canceled';
  type?: SessionType;
}

export class PrivateSessionService {
  private static baseUrl = '/api/sessions';

  /**
   * Create a private session for multiple students
   */
  static async createPrivateSession(payload: CreatePrivateSessionRequest): Promise<SessionDto> {
    const response = await apiClient.post(`${this.baseUrl}/private-class`, payload);
    return response.data;
  }
}
