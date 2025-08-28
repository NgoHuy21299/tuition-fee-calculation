import React from "react";
import { useNavigate } from "react-router";
import UserDropdown from "./UserDropdown";

type DashboardHeaderProps = {
  onChangePassword?: () => void;
};

export default function DashboardHeader({ onChangePassword }: DashboardHeaderProps) {
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      navigate("/login?reason=logout", { replace: true });
    }
  }
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <UserDropdown onLogout={onLogout} onChangePassword={onChangePassword} />
      </div>
    </header>
  );
}
