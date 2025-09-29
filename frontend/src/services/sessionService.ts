import apiClient from '../api/client';

// Types matching backend DTOs
export interface SessionDto {
  id: string;
  classId: string | null;
  teacherId: string;
  startTime: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'canceled';
  notes: string | null;
  feePerSession: number | null;
  type: 'class' | 'ad_hoc';
  seriesId: string | null;
  createdAt: string;
  className?: string | null;
}

export interface CreateSessionRequest {
  classId?: string | null;
  startTime: string;
  durationMin: number;
  feePerSession?: number | null;
  notes?: string | null;
  status?: 'scheduled' | 'completed' | 'canceled';
  type?: 'class' | 'ad_hoc';
}

export interface CreateSessionSeriesRequest {
  classId?: string | null;
  startTime: string;
  durationMin: number;
  feePerSession?: number | null;
  notes?: string | null;
  type?: 'class' | 'ad_hoc';
  recurrence: {
    daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
    endDate: string;
    maxOccurrences?: number;
  };
}

export interface UpdateSessionRequest {
  startTime?: string;
  durationMin?: number;
  feePerSession?: number | null;
  notes?: string | null;
  status?: 'scheduled' | 'completed' | 'canceled';
}

export class SessionService {
  private static baseUrl = '/api/sessions';

  /**
   * List all sessions for the current teacher (for teacher's session management page)
   */
  static async getAllSessions(): Promise<SessionDto[]> {
    const response = await apiClient.get(this.baseUrl);
    return response.data;
  }

  /**
   * List sessions for a specific class
   */
  static async listSessions(
    classId: string,
    options?: { startTimeBegin?: string; startTimeEnd?: string }
  ): Promise<SessionDto[]> {
    const params = new URLSearchParams();
    if (options?.startTimeBegin) {
      params.append('startTimeBegin', options.startTimeBegin);
    }
    if (options?.startTimeEnd) {
      params.append('startTimeEnd', options.startTimeEnd);
    }
    const queryString = params.toString();
    const url = queryString
      ? `/api/classes/${classId}/sessions?${queryString}`
      : `/api/classes/${classId}/sessions`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a single session
   */
  static async createSession(payload: CreateSessionRequest): Promise<SessionDto> {
    const response = await apiClient.post(this.baseUrl, payload);
    return response.data;
  }

  /**
   * Create a series of recurring sessions
   */
  static async createSessionSeries(payload: CreateSessionSeriesRequest): Promise<SessionDto[]> {
    const response = await apiClient.post(`${this.baseUrl}/series`, payload);
    return response.data;
  }

  /**
   * Get a specific session by ID
   */
  static async getSession(id: string): Promise<SessionDto> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Update a session
   */
  static async updateSession(id: string, patch: UpdateSessionRequest): Promise<SessionDto> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}`, patch);
    return response.data;
  }

  /**
   * Cancel a session
   */
  static async cancelSession(id: string): Promise<SessionDto> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/cancel`);
    return response.data;
  }

  /**
   * Mark a session as completed
   */
  static async completeSession(id: string): Promise<SessionDto> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/complete`);
    return response.data;
  }

  /**
   * Unlock a completed session back to scheduled with a reason
   */
  static async unlockSession(id: string, reason: string): Promise<SessionDto> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/unlock`, { reason });
    return response.data;
  }

  /**
   * Delete a session
   */
  static async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * List upcoming sessions (for dashboard)
   */
  static async getUpcomingSessions(options?: { limit?: number; from?: string }): Promise<SessionDto[]> {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.from) {
      params.append('from', options.from);
    }

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/upcoming?${queryString}` : `${this.baseUrl}/upcoming`;
    
    const response = await apiClient.get(url);
    return response.data;
  }
}