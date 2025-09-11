export default function DashboardSettings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cài đặt</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Thiết lập hệ thống: thông tin trung tâm, chính sách học phí, thông báo, bảo mật.
      </p>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <p className="text-sm text-gray-500">
          Tính năng sẽ được bổ sung: thay đổi mật khẩu, cấu hình thanh toán, mẫu biên lai...
        </p>
      </div>
    </div>
  );
}
