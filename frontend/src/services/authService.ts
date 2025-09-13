import client from "../api/client";

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { token: string };

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
};
export type RegisterResponse = { token: string };

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export const authService = {
  async login(payload: LoginRequest) {
    const { data } = await client.post<LoginResponse>(
      "/api/auth/login",
      payload
    );
    return data;
  },

  async register(payload: RegisterRequest) {
    const { data } = await client.post<RegisterResponse>(
      "/api/auth/register",
      payload
    );
    return data;
  },

  async logout() {
    await client.post("/api/auth/logout");
  },

  async changePassword(payload: ChangePasswordRequest) {
    await client.post("/api/auth/change-password", payload, {
      headers: { "Content-Type": "application/json" },
    });
  },
};
