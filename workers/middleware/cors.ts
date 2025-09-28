export function withCORS<Env = unknown>(
  handler: (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response,
) {
  return async (req: Request, env: Env, ctx: ExecutionContext) => {
    const origin = req.headers.get("Origin") || "";
    const isPreflight = req.method === "OPTIONS";

    // Example: const allowOrigin = origin && ALLOWLIST.includes(origin) ? origin : "";
    const allowOrigin = origin || ""; // echo request origin if present

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      // Cache preflight for 24 hours to reduce frequency
      "Access-Control-Max-Age": "86400",
      // Uncomment if using cookies across origins
      // "Access-Control-Allow-Credentials": "true",
    };

    if (isPreflight) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const res = await handler(req, env, ctx);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) newHeaders.set(k, v);
    return new Response(res.body, { status: res.status, headers: newHeaders });
  };
}
