import type { Route } from "./+types/dashboard.overview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Overview" },
    { name: "description", content: "Overview of the tutoring management dashboard" },
  ];
}

export default function DashboardOverview() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tổng quan</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Đây là bảng điều khiển quản lý dạy học thêm. Bạn có thể theo dõi lịch học,
          lớp học, học viên, điểm danh, thu học phí và các báo cáo tổng hợp.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Lịch sắp tới</h2>
          <p className="text-sm text-gray-500">Các buổi học trong tuần tới.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Tình trạng lớp</h2>
          <p className="text-sm text-gray-500">Số lớp đang hoạt động và tạm dừng.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Tài chính nhanh</h2>
          <p className="text-sm text-gray-500">Doanh thu dự kiến và khoản phải thu.</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-medium">Bắt đầu nhanh</h2>
        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Thêm lớp học mới và thiết lập học phí.</li>
          <li>Thêm học viên và gán vào lớp.</li>
          <li>Lập lịch buổi học, điểm danh và ghi nhận kết quả.</li>
          <li>Xuất hóa đơn/biên lai và theo dõi thanh toán.</li>
        </ul>
      </div>
    </div>
  );
}

