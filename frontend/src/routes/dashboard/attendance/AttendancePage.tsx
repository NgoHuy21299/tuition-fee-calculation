import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { AttendanceForm } from '../../../components/attendance/AttendanceForm';
import { AlertCircle } from 'lucide-react';
import LoadingSpinner from '../../../components/commons/LoadingSpinner';
import { AttendanceService } from '../../../services/attendanceService';
import { SessionService } from '../../../services/sessionService';
import type { 
  AttendanceDto, 
  BulkAttendanceRequest,
  BulkAttendanceResult 
} from '../../../services/attendanceService';
import type { SessionDto } from '../../../services/sessionService';
import BackNavigation from '../../../components/commons/BackNavigation';

export default function AttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [session, setSession] = useState<SessionDto | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load session and attendance data in parallel
      const [sessionData, attendanceData] = await Promise.all([
        SessionService.getSession(sessionId),
        AttendanceService.getSessionAttendance(sessionId)
      ]);
      
      setSession(sessionData);
      setAttendanceList(attendanceData);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
      setError('Không thể tải dữ liệu điểm danh. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      void loadData();
    }
  }, [sessionId, loadData]);

  const handleSave = async (payload: BulkAttendanceRequest): Promise<BulkAttendanceResult> => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    setIsSaving(true);
    try {
      const result = await AttendanceService.markAttendance(sessionId, payload);
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSession = async () => {
    if (!sessionId) return;
    if (!confirm('Bạn có chắc chắn muốn hủy buổi học này?')) return;

    setError(null);
    try {
      await SessionService.cancelSession(sessionId);
      // After successful cancellation, go back to previous page
      handleBack();
    } catch (err) {
      console.error('Failed to cancel session:', err);
      setError('Không thể hủy buổi học. Vui lòng thử lại.');
    }
  };

  // Support two shapes in location.state:
  // - { from: string } (used by Overview when navigating to attendance)
  // - { backTo?: string; backTab?: string } (older convention)
  const backState = (location.state as { from?: string; backTo?: string; backTab?: string } | null) || null;
  const handleBack = () => {
    // Navigate back to previous context if provided. Prefer `from` (Overview)
    if (backState?.from) {
      navigate(backState.from, { state: { tab: backState.backTab ?? 'sessions' } });
      return;
    }
    if (backState?.backTo) {
      navigate(backState.backTo, { state: { tab: backState.backTab ?? 'sessions' } });
      return;
    }
    if (session?.classId) {
      navigate(`/dashboard/classes/${session.classId}`, { state: { tab: 'sessions' } });
    } else {
      navigate('/dashboard/classes');
    }
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600">Session ID không hợp lệ</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard/classes')}>
              Quay lại danh sách lớp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <BackNavigation
            to={backState?.from ?? backState?.backTo ?? (session?.classId ? `/dashboard/classes/${session.classId}` : '/dashboard/classes')}
            state={{ tab: backState?.backTab ?? 'sessions' }}
            text="Quay lại"
            className="w-auto"
          />
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={loadData}>Thử lại</Button>
              <Button variant="outline" onClick={handleBack}>Quay lại</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackNavigation
          to={backState?.from ?? backState?.backTo ?? (session?.classId ? `/dashboard/classes/${session.classId}` : '/dashboard/classes')}
          state={{ tab: backState?.backTab ?? 'sessions' }}
          text="Quay lại"
          className="w-auto"
        />
        <div>
          <h1 className="text-2xl font-bold">Điểm danh</h1>
          {session && (
            <p className="text-muted-foreground">
              {session.type === 'class' ? `Buổi học lớp ${session.className ?? ''}` : 'Buổi học riêng'}
            </p>
          )}
        </div>
      </div>

      {/* Action bar moved into AttendanceForm (cancel button placed next to Làm mới) */}

      {/* Main Content */}
      {isLoading || !session ? (
        <Card>
          <CardContent className="p-8 text-center">
            <LoadingSpinner size={32} />
          </CardContent>
        </Card>
      ) : (
        <AttendanceForm
          session={session}
          attendanceList={attendanceList}
          onSave={handleSave}
          onRefresh={loadData}
          isLoading={isLoading}
          isSaving={isSaving}
          onComplete={async () => {
            if (!sessionId) return;
            try {
              await SessionService.completeSession(sessionId);
              // After successful completion, navigate back similar to back button
              handleBack();
            } catch (err) {
              console.error('Failed to complete session:', err);
              setError('Không thể đánh dấu hoàn thành buổi học. Vui lòng thử lại.');
            }
          }}
          onUnlock={async (reason: string) => {
            if (!sessionId) return;
            try {
              await SessionService.unlockSession(sessionId, reason);
              // Refresh current data to reflect status change back to scheduled
              await loadData();
            } catch (err) {
              console.error('Failed to unlock session:', err);
              setError('Không thể mở khoá điểm danh. Vui lòng thử lại.');
            }
          }}
          onCancelSession={handleCancelSession}
          isCancelling={false}
        />
      )}
    </div>
  );
}
