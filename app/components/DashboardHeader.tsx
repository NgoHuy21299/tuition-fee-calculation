import React from "react";
import { useNavigate } from "react-router";

type DashboardHeaderProps = {
};

export default function DashboardHeader({ }: DashboardHeaderProps) {
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      navigate("/login");
    }
  }
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">Giáo viên</div>
        <button
          onClick={onLogout}
          className="h-9 px-3 rounded-md border border-gray-300 dark:border-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
