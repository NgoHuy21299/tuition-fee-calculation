import { Card } from "../../components/ui/card";

export default function DashboardTuition() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Học phí</h1>
      <p className="text-sm text-gray-400">
        Theo dõi học phí, công nợ và các khoản thanh toán.
      </p>
      <Card>
        <p className="text-sm text-gray-500">
          Tính năng sẽ được bổ sung: tạo bảng phí, ghi nhận thanh toán, xuất hóa
          đơn...
        </p>
      </Card>
    </div>
  );
}
