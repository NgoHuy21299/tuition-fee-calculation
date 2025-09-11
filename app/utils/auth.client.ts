// Client-side auth utilities: token storage and API fetch wrapper

const TOKEN_STORAGE_KEY = "auth_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(TOKEN_STORAGE_KEY);
    else localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage errors (e.g., SSR, disabled storage)
  }
}

export function clearToken() {
  setToken(null);
}

// Wrapper around fetch that attaches Authorization header automatically for /api requests
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : (input as Request).url;
  const isApi = typeof url === "string" && url.startsWith("/api/");

  const headers = new Headers(init.headers || {});
  if (isApi) {
    const token = getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(input as any, { ...init, headers });

  if (res.status === 401 && isApi) {
    // Optional: clear token on unauthorized to force re-login
    clearToken();
  }

  return res;
}
