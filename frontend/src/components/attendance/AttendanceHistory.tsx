import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { 
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Check,
  X,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';
import { formatCurrency } from '../../utils/formatHelpers';
import { AttendanceService } from '../../services/attendanceService';
import type { 
  AttendanceWithSessionDto, 
  AttendanceStats,
  AttendanceQueryParams 
} from '../../services/attendanceService';

interface AttendanceHistoryProps {
  studentId: string;
  className?: string;
}

const statusConfig = {
  present: {
    label: 'Có mặt',
    icon: Check,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  absent: {
    label: 'Vắng mặt', 
    icon: X,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  late: {
    label: 'Muộn',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  }
} as const;

export function AttendanceHistory({ studentId, className }: AttendanceHistoryProps) {
  const [attendanceData, setAttendanceData] = useState<{
    attendance: AttendanceWithSessionDto[];
    stats: AttendanceStats;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceQueryParams>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadAttendanceHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await AttendanceService.getStudentAttendance(studentId, filters);
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to load attendance history:', err);
      setError('Không thể tải lịch sử điểm danh');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, filters]);

  useEffect(() => {
    void loadAttendanceHistory();
  }, [loadAttendanceHistory]);

  const handleFilterChange = (key: keyof AttendanceQueryParams, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Đang tải lịch sử điểm danh...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <X className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAttendanceHistory}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!attendanceData) {
    return null;
  }

  const { attendance, stats } = attendanceData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng buổi</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Có mặt</p>
                <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ tham dự</p>
                <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng phí</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.totalFees)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lịch sử điểm danh
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Bộ lọc
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Từ ngày</label>
                <Input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Đến ngày</label>
                <Input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          {attendance.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có dữ liệu điểm danh</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Lớp học</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Học phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => {
                  const config = statusConfig[record.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {formatDate(record.sessionStartTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatTime(record.sessionStartTime)} - {formatDuration(record.sessionDurationMin)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.className ? (
                          <div>
                            <div className="font-medium">{record.className}</div>
                            {record.classSubject && (
                              <div className="text-sm text-muted-foreground">
                                {record.classSubject}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Buổi học riêng</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.note ? (
                          <span className="text-sm">{record.note}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.calculatedFee !== null ? (
                          <span className="font-medium">
                            {formatCurrency(record.calculatedFee)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
