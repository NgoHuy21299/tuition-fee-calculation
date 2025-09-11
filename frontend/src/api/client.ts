import axios from "axios";
import { getToken, clearToken } from "../utils/auth";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

client.interceptors.request.use((config) => {
  const isApiPath = typeof config.url === "string" && config.url.startsWith("/api/");
  if (isApiPath) {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      // window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);

export default client;
