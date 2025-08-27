import type { ExecutionContext } from "@cloudflare/workers-types";

// Augment React Router's AppLoadContext to include the Cloudflare context
declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env; // from worker-configuration.d.ts (your Worker bindings)
      ctx: ExecutionContext;
    };
  }
}
