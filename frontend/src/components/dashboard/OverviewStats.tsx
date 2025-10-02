import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Users, GraduationCap, DollarSign } from "lucide-react";
import LoadingSpinner from "../commons/LoadingSpinner";

interface OverviewStatsProps {
  totalClasses: number;
  totalStudents: number;
  monthlyRevenue: number;
  isLoading: boolean;
  // Optional render prop to customize the entire revenue card
  renderRevenueCard?: (args: { value: number }) => React.ReactNode;
}

export default function OverviewStats({
  totalClasses,
  totalStudents,
  monthlyRevenue,
  isLoading,
  renderRevenueCard,
}: OverviewStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Classes and Students Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-500">
            Tổng quan hệ thống
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng số lớp</p>
                <p className="text-2xl font-bold">{totalClasses}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng số học sinh</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue Card (can be fully replaced via render prop) */}
      {renderRevenueCard ? (
        renderRevenueCard({ value: monthlyRevenue })
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Doanh thu tháng này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {monthlyRevenue.toLocaleString("vi-VN")}
                </p>
                <p className="text-sm text-gray-500">Tính đến thời điểm hiện tại</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
