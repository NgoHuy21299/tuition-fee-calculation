import React from "react";

type DashboardSidebarProps = {
};

export default function DashboardSidebar({ }: DashboardSidebarProps) {
  return (
    <aside
      className={
        "transition-all duration-200 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 w-60" 
      }
    >
      <div className="p-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Navigation
      </div>
      <nav className="px-2 py-2 space-y-1 text-sm">
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">Tổng quan</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">Lớp học</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">Học phí</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">Cài đặt</a>
      </nav>
    </aside>
  );
}
