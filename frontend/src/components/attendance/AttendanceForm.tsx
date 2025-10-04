import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Clock,
  Unlock
} from 'lucide-react';
import LoadingSpinner from '../commons/LoadingSpinner';
import { AttendanceRow } from './AttendanceRow';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';
import type { 
  AttendanceDto, 
  BulkAttendanceRequest,
  BulkAttendanceResult 
} from '../../services/attendanceService';
import type { SessionDto } from '../../services/sessionService';
import { ATTENDANCE_STATUS, SESSION_STATUS, type AttendanceStatus } from '../../constants';
import { useToast } from '../commons/Toast';

interface AttendanceFormProps {
  session: SessionDto;
  attendanceList: AttendanceDto[];
  onSave: (payload: BulkAttendanceRequest) => Promise<BulkAttendanceResult>;
  onRefresh: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  onComplete?: () => Promise<void>;
  onUnlock?: (reason: string) => Promise<void>;
  onCancelSession?: () => Promise<void> | void;
  isCancelling?: boolean;
}

interface AttendanceChanges {
  [studentId: string]: {
    status?: AttendanceStatus;
    note?: string;
    // feeOverride removed
  };
}

export function AttendanceForm({
  session,
  attendanceList,
  onSave,
  onRefresh,
  isLoading = false,
  isSaving = false,
  onComplete,
  onUnlock,
  onCancelSession,
  isCancelling = false,
}: AttendanceFormProps) {
  const [changes, setChanges] = useState<AttendanceChanges>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saveResult, setSaveResult] = useState<BulkAttendanceResult | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { toast } = useToast();

  // Calculate statistics
  const stats = {
    total: attendanceList.length,
    present: attendanceList.filter(a => getEffectiveStatus(a.studentId, a.status) === ATTENDANCE_STATUS.PRESENT).length,
    absent: attendanceList.filter(a => getEffectiveStatus(a.studentId, a.status) === ATTENDANCE_STATUS.ABSENT).length,
    late: attendanceList.filter(a => getEffectiveStatus(a.studentId, a.status) === ATTENDANCE_STATUS.LATE).length,
  };

  const handleUnlock = async () => {
    if (!onUnlock) return;
    const reason = window.prompt('Nhập lý do mở khoá điểm danh:');
    if (!reason || reason.trim().length < 3) return;
    setIsUnlocking(true);
    try {
      await onUnlock(reason.trim());
    } catch (err) {
      console.error('Unlock session failed', err);
    } finally {
      setIsUnlocking(false);
    }
  };

  // Removed total fees calculation

  const hasChanges = Object.keys(changes).length > 0;

  function getEffectiveStatus(
    studentId: string,
    originalStatus: AttendanceDto['status']
  ): AttendanceDto['status'] {
    return (changes[studentId]?.status ?? originalStatus) as AttendanceDto['status'];
  }

  // Removed effective fee helper

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    // Avoid redundant updates and toasts if status hasn't effectively changed
    const original = attendanceList.find(a => a.studentId === studentId)?.status ?? ATTENDANCE_STATUS.ABSENT;
    const currentEffective = getEffectiveStatus(studentId, original as AttendanceDto['status']);
    if (currentEffective === status) {
      return;
    }

    setChanges(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));

    const student = attendanceList.find(a => a.studentId === studentId);
    const statusLabel = status === ATTENDANCE_STATUS.PRESENT ? 'Có mặt' : status === ATTENDANCE_STATUS.ABSENT ? 'Vắng mặt' : 'Muộn';
    // Show a lightweight toast indicating the local change (not yet saved)
    toast({
      variant: 'success',
      title: 'Đã chọn trạng thái',
      description: `${student?.studentName ?? 'Học sinh'} → ${statusLabel} (chưa lưu)`,
      duration: 2000,
    });
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setChanges(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }));
  };

  // Removed fee override handler

  const handleBulkAction = (action: 'all-present' | 'all-absent') => {
    const bulkChanges: AttendanceChanges = {};
    const targetStatus = action === 'all-present' ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT;
    
    attendanceList.forEach(attendance => {
      bulkChanges[attendance.studentId] = {
        ...changes[attendance.studentId],
        status: targetStatus
      };
    });
    
    setChanges(bulkChanges);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    const attendanceRecords = Object.entries(changes).map(([studentId, change]) => ({
      studentId,
      status: change.status || attendanceList.find(a => a.studentId === studentId)?.status || ATTENDANCE_STATUS.ABSENT,
      note: change.note
    }));

    try {
      const result = await onSave({ attendanceRecords });
      setSaveResult(result);
      
      if (result.success) {
        setChanges({});
        setIsEditing(false);
        // Refresh data after successful save
        setTimeout(() => {
          onRefresh();
          setSaveResult(null);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleCancel = () => {
    setChanges({});
    setIsEditing(false);
    setSaveResult(null);
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    if (hasChanges) {
      const proceed = window.confirm('Bạn có thay đổi chưa lưu. Hoàn thành buổi học sẽ không lưu các thay đổi này. Tiếp tục?');
      if (!proceed) return;
    }
    setIsCompleting(true);
    try {
      await onComplete();
    } catch (err) {
      console.error('Complete session failed', err);
    } finally {
      setIsCompleting(false);
    }
  };

  // Create merged attendance list with changes
  const mergedAttendanceList: AttendanceDto[] = attendanceList.map(attendance => ({
    ...attendance,
    status: getEffectiveStatus(attendance.studentId, attendance.status),
    note: changes[attendance.studentId]?.note ?? attendance.note,
    // feeOverride removed from merged list
  }));

  return (
    <div className="space-y-6">
      {/* Session Info Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Điểm danh - {formatDate(session.startTime)}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(session.startTime)} - {formatDuration(session.durationMin)}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Cancel session button — placed left of refresh (if provided) */}
              {onCancelSession && session.status !== SESSION_STATUS.CANCELED && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void onCancelSession()}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <LoadingSpinner size={16} /> Hủy buổi học
                    </>
                  ) : (
                    'Hủy buổi học'
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size={16} /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Làm mới
              </Button>

              {/* Complete session button: show only when session is scheduled */}
              {session.status === SESSION_STATUS.SCHEDULED && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={handleComplete}
                  disabled={isCompleting}
                  title="Đánh dấu buổi học đã hoàn thành"
                >
                  {isCompleting ? <LoadingSpinner size={16} /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  {isCompleting ? (
                    <>
                      <LoadingSpinner size={16} /> Hoàn thành buổi học
                    </>
                  ) : (
                    'Hoàn thành buổi học'
                  )}
                </Button>
              )}

              {/* Unlock session button for completed sessions */}
              {session.status === SESSION_STATUS.COMPLETED && (
                <Button
                  size="sm"
                  variant="warning"
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  title="Mở khoá để tiếp tục chỉnh sửa điểm danh"
                >
                  {isUnlocking ? <LoadingSpinner size={16} /> : <Unlock className="h-4 w-4 mr-1" />}
                  {isUnlocking ? (
                    <>
                      <LoadingSpinner size={16} /> Mở khoá điểm danh
                    </>
                  ) : (
                    'Mở khoá điểm danh'
                  )}
                </Button>
              )}
              
              {session.status === SESSION_STATUS.SCHEDULED && (!isEditing ? (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={attendanceList.length === 0}
                >
                  Chỉnh sửa điểm danh
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? (
                      <>
                        <LoadingSpinner size={16} /> Lưu thay đổi
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Statistics */}
          <div className="flex gap-4 mb-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Tổng: {stats.total}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Có mặt: {stats.present}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              Vắng: {stats.absent}
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              Muộn: {stats.late}
            </Badge>
          </div>

          {/* Bulk Actions */}
          {isEditing && session.status === SESSION_STATUS.SCHEDULED && (
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant="success"
                onClick={() => handleBulkAction('all-present')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Tất cả có mặt
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleBulkAction('all-absent')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Tất cả vắng mặt
              </Button>
            </div>
          )}

          {/* Save Result */}
          {saveResult && (
            <div className={`p-3 rounded-md mb-4 ${
              saveResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {saveResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {saveResult.success 
                    ? `Lưu thành công ${saveResult.successCount}/${saveResult.totalRecords} bản ghi`
                    : `Lưu thất bại ${saveResult.failureCount}/${saveResult.totalRecords} bản ghi`
                  }
                </span>
              </div>
              
              {!saveResult.success && saveResult.results.some(r => !r.success) && (
                <div className="mt-2 text-sm">
                  Lỗi: {saveResult.results.filter(r => !r.success).map(r => r.error).join(', ')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <LoadingSpinner size={32} />
            </CardContent>
          </Card>
        ) : attendanceList.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có học sinh nào trong buổi học này</p>
            </CardContent>
          </Card>
        ) : (
          mergedAttendanceList.map(attendance => (
            <AttendanceRow
              key={attendance.studentId}
              attendance={attendance}
              onStatusChange={handleStatusChange}
              onNoteChange={handleNoteChange}
              isEditing={isEditing}
            />
          ))
        )}
      </div>
    </div>
  );
}
