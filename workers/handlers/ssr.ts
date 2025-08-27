import { createRequestHandler } from "react-router";

export function createSSRHandler() {
  const handler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );
  return (request: Request, env: Env, ctx: ExecutionContext) =>
    handler(request, {
      cloudflare: { env, ctx },
    });
}
