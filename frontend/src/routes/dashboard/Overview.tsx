import { Card } from "../../components/ui/card";

export default function DashboardOverview() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tổng quan</h1>
        <p className="text-sm text-gray-400">
          Đây là bảng điều khiển quản lý dạy học thêm. Bạn có thể theo dõi lịch
          học, lớp học, học viên, điểm danh, thu học phí và các báo cáo tổng
          hợp.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h2 className="font-medium">Lịch sắp tới</h2>
          <p className="text-sm text-gray-500">Các buổi học trong tuần tới.</p>
        </Card>
        <Card>
          <h2 className="font-medium">Tình trạng lớp</h2>
          <p className="text-sm text-gray-500">
            Số lớp đang hoạt động và tạm dừng.
          </p>
        </Card>
        <Card>
          <h2 className="font-medium">Tài chính nhanh</h2>
          <p className="text-sm text-gray-500">
            Doanh thu dự kiến và khoản phải thu.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium">Bắt đầu nhanh</h2>
        <ul className="list-disc pl-5 text-sm text-gray-400">
          <li>Thêm lớp học mới và thiết lập học phí.</li>
          <li>Thêm học viên và gán vào lớp.</li>
          <li>Lập lịch buổi học, điểm danh và ghi nhận kết quả.</li>
          <li>Xuất hóa đơn/biên lai và theo dõi thanh toán.</li>
        </ul>
      </Card>
    </div>
  );
}
