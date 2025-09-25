import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { AttendanceForm } from '../../../components/attendance/AttendanceForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { AttendanceService } from '../../../services/attendanceService';
import { SessionService } from '../../../services/sessionService';
import type { 
  AttendanceDto, 
  BulkAttendanceRequest,
  BulkAttendanceResult 
} from '../../../services/attendanceService';
import type { SessionDto } from '../../../services/sessionService';

export default function AttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
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

  const handleBack = () => {
    // Navigate back to class detail or session list
    if (session?.classId) {
      navigate(`/dashboard/classes/${session.classId}`);
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
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={loadData}>
                Thử lại
              </Button>
              <Button variant="outline" onClick={handleBack}>
                Quay lại
              </Button>
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
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Điểm danh</h1>
          {session && (
            <p className="text-muted-foreground">
              {session.type === 'class' ? 'Buổi học lớp' : 'Buổi học riêng'} • {session.id}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isLoading || !session ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
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
        />
      )}
    </div>
  );
}
