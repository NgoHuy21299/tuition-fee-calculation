import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionService, type SessionDto } from '../../services/sessionService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import LoadingSpinner from '../../components/commons/LoadingSpinner';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';
import { UserCheck } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await SessionService.getUpcomingSessions({ limit: 100 });
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <LoadingSpinner size={32} padding={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Quản lý buổi học</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>Thời lượng</TableHead>
            <TableHead>Lớp</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ghi chú</TableHead>
            <TableHead>ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                {formatTime(session.startTime)} - {formatDate(session.startTime)}
              </TableCell>
              <TableCell>{formatDuration(session.durationMin)}</TableCell>
              <TableCell>{session.className || <span className="text-gray-400">—</span>}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {session.status === 'scheduled'
                    ? 'Đã lên lịch'
                    : session.status === 'completed'
                    ? 'Hoàn thành'
                    : 'Đã hủy'}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={session.notes || ''}>
                  {session.notes ? session.notes.split('\n')[0].trim() : <span className="text-gray-400">—</span>}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(`/dashboard/attendance/${session.id}`, {
                      state: { backTo: '/dashboard/sessions' },
                    })
                  }
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Điểm danh
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
