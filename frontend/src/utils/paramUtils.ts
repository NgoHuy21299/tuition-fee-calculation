export function toQueryString(params: Record<string, unknown>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      usp.set(k, String(v));
    }
    const qs = usp.toString();
    return qs ? `?${qs}` : "";
}