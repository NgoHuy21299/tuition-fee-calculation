import { useState, useEffect, useCallback } from 'react';
import { SessionService, type SessionDto } from '../../services/sessionService';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreHorizontal, Plus, Calendar, Edit, Trash2, Ban } from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';
import { formatCurrency } from '../../utils/formatHelpers';

interface SessionListProps {
  classId: string;
  onCreateSession?: () => void;
  onCreateSeries?: () => void;
  onEditSession?: (session: SessionDto) => void;
}

const statusColors: Record<SessionDto['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  canceled: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<SessionDto['status'], string> = {
  scheduled: 'Đã lên lịch',
  completed: 'Hoàn thành',
  canceled: 'Đã hủy',
};

export function SessionList({ 
  classId, 
  onCreateSession, 
  onCreateSeries, 
  onEditSession 
}: SessionListProps) {
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'canceled'>('all');

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SessionService.listSessions(classId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy buổi học này?')) {
      return;
    }

    try {
      await SessionService.cancelSession(sessionId);
      await loadSessions(); // Refresh list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Không thể hủy buổi học';
      alert('Lỗi: ' + errorMessage);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa buổi học này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await SessionService.deleteSession(sessionId);
      await loadSessions(); // Refresh list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Không thể xóa buổi học';
      alert('Lỗi: ' + errorMessage);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  if (loading) {
    return <div className="text-center py-4">Đang tải danh sách buổi học...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header với actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Tất cả ({sessions.length})
          </Button>
          <Button
            variant={filter === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('scheduled')}
          >
            Đã lên lịch ({sessions.filter(s => s.status === 'scheduled').length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Hoàn thành ({sessions.filter(s => s.status === 'completed').length})
          </Button>
          <Button
            variant={filter === 'canceled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('canceled')}
          >
            Đã hủy ({sessions.filter(s => s.status === 'canceled').length})
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={onCreateSession} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tạo buổi học
          </Button>
          <Button onClick={onCreateSeries} variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Tạo lịch học
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === 'all' 
            ? 'Chưa có buổi học nào. Tạo buổi học đầu tiên?' 
            : `Không có buổi học nào ở trạng thái "${statusLabels[filter as keyof typeof statusLabels]}"`
          }
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày & Giờ</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Học phí</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-20">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatDate(session.startTime)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(session.startTime)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDuration(session.durationMin)}
                  </TableCell>
                  <TableCell>
                    {session.feePerSession 
                      ? formatCurrency(session.feePerSession) 
                      : <span className="text-gray-400">Theo lớp</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={statusColors[session.status]}
                    >
                      {statusLabels[session.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={session.notes || ''}>
                      {session.notes || <span className="text-gray-400">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => onEditSession?.(session)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        
                        {session.status === 'scheduled' && (
                          <DropdownMenuItem 
                            onClick={() => handleCancelSession(session.id)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Hủy buổi học
                          </DropdownMenuItem>
                        )}
                        
                        {session.status === 'canceled' && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa vĩnh viễn
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}