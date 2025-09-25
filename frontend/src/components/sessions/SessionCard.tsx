import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Clock, Users } from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';
import { formatCurrency } from '../../utils/formatHelpers';
import type { SessionDto } from '../../services/sessionService';

interface SessionCardProps {
  session: SessionDto;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
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

export function SessionCard({ 
  session, 
  onEdit, 
  onCancel, 
  onDelete 
}: SessionCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {formatDate(session.startTime)}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {formatTime(session.startTime)} - {formatDuration(session.durationMin)}
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={statusColors[session.status]}
          >
            {statusLabels[session.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Fee */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {session.feePerSession 
              ? formatCurrency(session.feePerSession)
              : <span className="text-muted-foreground">Theo lớp</span>
            }
          </span>
        </div>

        {/* Notes */}
        {session.notes && (
          <div className="text-sm text-muted-foreground">
            {session.notes.length > 100 
              ? `${session.notes.substring(0, 100)}...`
              : session.notes
            }
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Chỉnh sửa
          </Button>
          
          {session.status === 'scheduled' && onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
          )}
          
          {session.status === 'canceled' && onDelete && (
            <Button size="sm" variant="danger" onClick={onDelete}>
              Xóa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}