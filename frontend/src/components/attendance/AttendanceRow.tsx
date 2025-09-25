import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { 
  User, 
  Clock, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ButtonProps } from '../ui/button';
import { formatCurrency } from '../../utils/formatHelpers';
import { formatTime } from '../../utils/dateHelpers';
import type { AttendanceDto } from '../../services/attendanceService';

type Status = 'present' | 'absent' | 'late';

interface AttendanceRowProps {
  attendance: AttendanceDto;
  onStatusChange: (studentId: string, status: Status) => void;
  onNoteChange: (studentId: string, note: string) => void;
  onFeeOverrideChange: (studentId: string, feeOverride: number | null) => void;
  isEditing?: boolean;
}

const statusConfig: Record<Status, {
  label: string;
  icon: LucideIcon;
  color: string;
  buttonColor: ButtonProps['variant'];
}> = {
  present: {
    label: 'Có mặt',
    icon: Check,
    color: 'bg-green-100 text-green-800 border-green-200',
    buttonColor: 'success'
  },
  absent: {
    label: 'Vắng mặt', 
    icon: X,
    color: 'bg-red-100 text-red-800 border-red-200',
    buttonColor: 'danger'
  },
  late: {
    label: 'Muộn',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    buttonColor: 'outline'
  }
};

export function AttendanceRow({
  attendance,
  onStatusChange,
  onNoteChange,
  onFeeOverrideChange,
  isEditing = false
}: AttendanceRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localNote, setLocalNote] = useState(attendance.note || '');
  const [localFeeOverride, setLocalFeeOverride] = useState(
    attendance.feeOverride?.toString() || ''
  );

  const config = statusConfig[attendance.status];
  const StatusIcon = config.icon;

  const handleNoteBlur = () => {
    onNoteChange(attendance.studentId, localNote);
  };

  const handleFeeOverrideBlur = () => {
    const value = localFeeOverride.trim();
    const numericValue = value ? parseInt(value.replace(/[^\d]/g, ''), 10) : null;
    onFeeOverrideChange(attendance.studentId, numericValue);
  };

  const handleStatusClick = (status: Status) => {
    if (isEditing) {
      onStatusChange(attendance.studentId, status);
    }
  };

  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        {/* Main row */}
        <div className="flex items-center justify-between">
          {/* Student info */}
          <div className="flex items-center gap-3 flex-1">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{attendance.studentName}</div>
              {(attendance.studentEmail || attendance.studentPhone) && (
                <div className="text-sm text-muted-foreground">
                  {attendance.studentEmail && attendance.studentPhone
                    ? `${attendance.studentEmail} • ${attendance.studentPhone}`
                    : attendance.studentEmail || attendance.studentPhone
                  }
                </div>
              )}
            </div>
          </div>

          {/* Status buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              // Editable status buttons
              <div className="flex gap-1">
                {(Object.entries(statusConfig) as [Status, typeof statusConfig[Status]][]).map(([status, config]) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={attendance.status === status ? config.buttonColor : 'outline'}
                    onClick={() => handleStatusClick(status)}
                    className="min-w-[80px]"
                  >
                    <config.icon className="h-4 w-4 mr-1" />
                    {config.label}
                  </Button>
                ))}
              </div>
            ) : (
              // Read-only status badge
              <Badge className={config.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            )}

            {/* Fee display */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[100px] justify-end">
              <DollarSign className="h-4 w-4" />
              {attendance.calculatedFee !== null 
                ? formatCurrency(attendance.calculatedFee)
                : 'Chưa tính'
              }
            </div>

            {/* Expand button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Note field */}
            <div>
              <label className="text-sm font-medium mb-1 block">Ghi chú</label>
              {isEditing ? (
                <Input
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Thêm ghi chú..."
                  className="w-full"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  {attendance.note || 'Không có ghi chú'}
                </div>
              )}
            </div>

            {/* Fee override */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Ghi đè học phí
                {attendance.feeOverride && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (Ghi đè mức mặc định)
                  </span>
                )}
              </label>
              {isEditing ? (
                <Input
                  value={localFeeOverride}
                  onChange={(e) => setLocalFeeOverride(e.target.value)}
                  onBlur={handleFeeOverrideBlur}
                  placeholder="Nhập số tiền..."
                  className="w-full"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  {attendance.feeOverride 
                    ? formatCurrency(attendance.feeOverride)
                    : 'Sử dụng mức mặc định'
                  }
                </div>
              )}
            </div>

            {/* Last modified info */}
            {attendance.markedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Cập nhật lần cuối: {formatTime(attendance.markedAt)}
                {attendance.markedBy && ` bởi ${attendance.markedBy}`}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
