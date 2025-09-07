import React from "react";
import { NavLink } from "react-router";

type DashboardSidebarProps = {};

export default function DashboardSidebar({}: DashboardSidebarProps) {
  const itemClasses = (isActive: boolean) =>
    [
      "block px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
        : "hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300",
    ].join(" ");

  return (
    <aside className="transition-all duration-200 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 w-60">
      <div className="p-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Navigation
      </div>
      <nav className="px-2 py-2 space-y-1 text-sm">
        <NavLink to="/dashboard/overview" end className={({ isActive }) => itemClasses(isActive)}>
          Tổng quan
        </NavLink>
        <NavLink to="/dashboard/classes" className={({ isActive }) => itemClasses(isActive)}>
          Lớp học
        </NavLink>
        <NavLink to="/dashboard/tuition" className={({ isActive }) => itemClasses(isActive)}>
          Học phí
        </NavLink>
        <NavLink to="/dashboard/settings" className={({ isActive }) => itemClasses(isActive)}>
          Cài đặt
        </NavLink>
      </nav>
    </aside>
  );
}

