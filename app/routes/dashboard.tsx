import type { Route } from "./+types/dashboard";
import { redirect } from "react-router";
import DashboardShell from "../components/DashboardShell";
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
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Xin chào!</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Đây là trang dashboard dùng để kiểm thử cơ chế đăng nhập bắt buộc
          (requireUser).
        </p>
      </div>
    </DashboardShell>
  );
}
