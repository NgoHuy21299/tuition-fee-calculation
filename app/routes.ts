import { type RouteConfig, index } from "@react-router/dev/routes";

import { route } from "@react-router/dev/routes";

export default [
  index("routes/root-redirect.tsx"),
  route("/login", "routes/login.tsx"),
  route("/register", "routes/register.tsx"),
  route("/dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard.index.tsx"),
    route("overview", "routes/dashboard.overview.tsx"),
    route("classes", "routes/dashboard.classes.tsx"),
    route("tuition", "routes/dashboard.tuition.tsx"),
    route("settings", "routes/dashboard.settings.tsx"),
  ]),
] satisfies RouteConfig;
