import type { Route } from "./+types/dashboard.classes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Classes" },
    { name: "description", content: "Manage classes in the tutoring system" },
  ];
}

export default function DashboardClasses() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lớp học</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Quản lý danh sách lớp, sĩ số, lịch học và giáo viên phụ trách.
      </p>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-gray-500">
          Tính năng sẽ được bổ sung: tạo lớp, gán học viên, lịch học, điểm danh...
        </p>
      </div>
    </div>
  );
}

