import { Card } from "../../components/ui/card";

export default function DashboardSettings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cài đặt</h1>
      <p className="text-sm text-gray-400">
        Thiết lập hệ thống: thông tin trung tâm, chính sách học phí, thông báo,
        bảo mật.
      </p>
      <Card>
        <p className="text-sm text-gray-500">
          Tính năng sẽ được bổ sung: thay đổi mật khẩu, cấu hình thanh toán, mẫu
          biên lai...
        </p>
      </Card>
    </div>
  );
}
