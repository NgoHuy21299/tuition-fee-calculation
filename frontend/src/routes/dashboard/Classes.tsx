import { Card } from "../../components/ui/card";

export default function DashboardClasses() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lớp học</h1>
      <p className="text-sm text-gray-400">
        Quản lý danh sách lớp, sĩ số, lịch học và giáo viên phụ trách.
      </p>
      <Card>
        <p className="text-sm text-gray-500">
          Tính năng sẽ được bổ sung: tạo lớp, gán học viên, lịch học, điểm
          danh...
        </p>
      </Card>
    </div>
  );
}
