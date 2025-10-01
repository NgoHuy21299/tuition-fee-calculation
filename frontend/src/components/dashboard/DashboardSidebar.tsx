import { NavLink } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function DashboardSidebar() {
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };
  const menuItems = [
    { label: "Tổng quan", to: "/dashboard/overview", end: true },
    { label: "Lớp học", to: "/dashboard/classes" },
    { label: "Học sinh", to: "/dashboard/students" },
    { label: "Buổi học", to: "/dashboard/sessions" },
    { label: "Báo cáo", to: "/dashboard/reports" },
    {
      label: "Công cụ",
      children: [{ label: "Nhận xét lớp", to: "/dashboard/class-remark" }],
    },
    { label: "Cài đặt", to: "/dashboard/settings" },
  ];

  const itemClasses = (isActive: boolean) =>
    [
      "block px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-gray-900 text-gray-100"
        : "hover:bg-gray-900 text-gray-300",
    ].join(" ");

  return (
    <aside className="transition-all duration-200 border-r border-gray-800 bg-gray-950 w-60 h-[calc(100vh-64px)]">
      <nav className="px-2 py-2 space-y-1 text-sm h-full overflow-y-auto">
        {menuItems.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                type="button"
                className="flex justify-between items-center px-3 py-2 w-full text-left rounded-md transition-colors hover:bg-gray-900 text-gray-300 cursor-pointer"
                onClick={() => toggleMenu(item.label)}
              >
                <span>{item.label}</span>
                {openMenus.includes(item.label) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openMenus.includes(item.label) && (
                <div className="pl-4 space-y-1">
                  {item.children.map((sub) => (
                    <NavLink
                      key={sub.label}
                      to={sub.to}
                      className={({ isActive }) => itemClasses(isActive)}
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.label}
              to={item.to!}
              end={item.end}
              className={({ isActive }) => itemClasses(isActive)}
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
