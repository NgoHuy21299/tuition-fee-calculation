import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Users, GraduationCap, DollarSign } from "lucide-react";
import LoadingSpinner from "../commons/LoadingSpinner";

interface OverviewStatsProps {
  totalClasses: number;
  totalStudents: number;
  monthlyRevenue: number;
  // Split loading flags so each card can load independently
  isLoadingCounts: boolean;
  isLoadingRevenue: boolean;
  // Optional render prop to customize the entire revenue card
  renderRevenueCard?: (args: { value: number; isLoading: boolean }) => React.ReactNode;
}

export default function OverviewStats({
  totalClasses,
  totalStudents,
  monthlyRevenue,
  isLoadingCounts,
  isLoadingRevenue,
  renderRevenueCard,
}: OverviewStatsProps) {
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
          {isLoadingCounts ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner />
            </div>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue Card (can be fully replaced via render prop) */}
      {renderRevenueCard ? (
        renderRevenueCard({ value: monthlyRevenue, isLoading: isLoadingRevenue })
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
                  {isLoadingRevenue ? (
                    <LoadingSpinner size={20} padding={4} />
                  ) : (
                    monthlyRevenue.toLocaleString("vi-VN")
                  )}
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
