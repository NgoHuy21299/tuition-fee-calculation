import type { Route } from "./+types/dashboard";
import { Outlet, redirect } from "react-router";
import DashboardShell from "../components/dashboard/DashboardShell";
import { requireUser } from "../utils/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard" },
    { name: "description", content: "Tổng quan hệ thống" },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireUser(request, context.cloudflare.env);
  if (!user) {
    throw redirect("/login?reason=auth");
  }
  return { user };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
