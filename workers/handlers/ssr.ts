import { createRequestHandler } from "react-router";
import { withCORS } from "../middleware/cors";

export function createSSRHandler() {
  const handler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );
  return withCORS((request: Request, env: Env, ctx: ExecutionContext) =>
    handler(request, {
      cloudflare: { env, ctx },
    })
  );
}
