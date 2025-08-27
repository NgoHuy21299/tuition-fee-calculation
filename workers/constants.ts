export const COOKIE_NAME = "auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

export const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/favicon.ico",
];

export const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
];
