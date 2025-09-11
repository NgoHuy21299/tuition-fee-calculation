import type { Route } from "./+types/dashboard";
import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { getToken } from "../utils/auth.client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard" },
    { name: "description", content: "Tổng quan hệ thống" },
  ];
}

// Phase 3: Client-side auth guard (token stored in client storage)
export async function loader({}: Route.LoaderArgs) {
  // No SSR auth gating since token is in localStorage (unavailable on server)
  return null;
}

export default function Dashboard({}: Route.ComponentProps) {
  const navigate = useNavigate();
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login?reason=auth");
    }
  }, [navigate]);
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
