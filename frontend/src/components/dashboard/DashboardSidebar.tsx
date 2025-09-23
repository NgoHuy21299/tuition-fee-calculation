import { NavLink } from "react-router-dom";

export default function DashboardSidebar() {
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
        <NavLink
          to="/dashboard/overview"
          end
          className={({ isActive }) => itemClasses(isActive)}
        >
          Tổng quan
        </NavLink>
        <NavLink
          to="/dashboard/classes"
          className={({ isActive }) => itemClasses(isActive)}
        >
          Lớp học
        </NavLink>
        <NavLink
          to="/dashboard/students"
          className={({ isActive }) => itemClasses(isActive)}
        >
          Học sinh
        </NavLink>
        <NavLink
          to="/dashboard/tuition"
          className={({ isActive }) => itemClasses(isActive)}
        >
          Học phí
        </NavLink>
        <NavLink
          to="/dashboard/class-remark"
          className={({ isActive }) => itemClasses(isActive)}
        >
          Nhận xét lớp
        </NavLink>
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) => itemClasses(isActive)}
        >
          Cài đặt
        </NavLink>
      </nav>
    </aside>
  );
}
