import { useState } from 'react';
import { SessionList } from './SessionList';
import { SessionForm } from './SessionForm';
import { SessionSeriesForm } from './SessionSeriesForm';
import { SessionService, type SessionDto, type CreateSessionRequest } from '../../services/sessionService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { useToast } from '../commons/Toast';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';

interface SessionsTabProps {
  classId: string;
  defaultFeePerSession?: number;
}

export function SessionsTab({ classId, defaultFeePerSession }: SessionsTabProps) {
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [showSeriesOptions, setShowSeriesOptions] = useState(false);
  const [copyPreviewOpen, setCopyPreviewOpen] = useState(false);
  const [copyPreviewItems, setCopyPreviewItems] = useState<Array<{
    startTime: string;
    durationMin: number;
    feePerSession: number | null;
    notes: string | null;
  }>>([]);
  const [editingSession, setEditingSession] = useState<SessionDto | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const handleCreateSession = () => {
    setEditingSession(undefined);
    setShowSessionForm(true);
  };

  const handleCreateSeries = () => {
    setShowSeriesOptions(true);
  };

  const handleEditSession = (session: SessionDto) => {
    setEditingSession(session);
    setShowSessionForm(true);
  };

  const handleCloseSessionForm = () => {
    setShowSessionForm(false);
    setEditingSession(undefined);
  };

  const handleCloseSeriesForm = () => {
    setShowSeriesForm(false);
  };

  const handleFormSuccess = () => {
    // Trigger refresh of session list
    setRefreshKey((prev) => prev + 1);
  };

  // Helpers
  function getWeekRange(ref: Date) {
    const start = new Date(ref);
    const day = start.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = (day === 0 ? -6 : 1) - day; // move to Monday
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async function handleCopyLastWeek() {
    try {
      const now = new Date();
      const thisWeek = getWeekRange(now);
      const lastWeekEnd = new Date(thisWeek.start);
      lastWeekEnd.setDate(thisWeek.start.getDate() - 1);
      const lastWeek = getWeekRange(lastWeekEnd);

      // Fetch sessions in last week via API with time filters (UTC)
      // Calculate UTC bounds for last week
      const beginLocal = new Date(lastWeek.start);
      beginLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(lastWeek.end);
      // Convert local start/end to UTC ISO strings
      const startTimeBegin = beginLocal.toISOString();
      const startTimeEnd = endLocal.toISOString();
      const sessions = await SessionService.listSessions(classId, { startTimeBegin, startTimeEnd });
      // Filter out any canceled sessions just in case
      const lastWeekSessions = sessions.filter((s) => {
        const d = new Date(s.startTime);
        return d >= lastWeek.start && d <= lastWeek.end;
      });

      if (lastWeekSessions.length === 0) {
        toast({ variant: 'warning', title: 'Không có dữ liệu', description: 'Tuần trước không có buổi học để sao chép.' });
        return;
      }

      // Prepare shifted preview items by 7 days, sorted by time
      const items = lastWeekSessions
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .map((s) => {
          const d = new Date(s.startTime);
          d.setDate(d.getDate() + 7);
          return {
            startTime: d.toISOString(),
            durationMin: s.durationMin,
            feePerSession: s.feePerSession ?? null,
            notes: s.notes ?? null,
          };
        });

      setCopyPreviewItems(items);
      setShowSeriesOptions(false);
      setCopyPreviewOpen(true);
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : 'Không thể tạo lịch giống tuần trước';
      toast({ variant: 'error', title: 'Lỗi', description });
    }
  }

  async function confirmCreateFromPreview() {
    try {
      const payloads: CreateSessionRequest[] = copyPreviewItems.map((it) => ({
        classId,
        startTime: it.startTime,
        durationMin: it.durationMin,
        feePerSession: it.feePerSession,
        notes: it.notes,
        status: 'scheduled',
        type: 'class',
      }));

      for (const p of payloads) {
        await SessionService.createSession(p);
      }

      toast({ variant: 'success', title: 'Đã tạo lịch', description: `Đã tạo ${payloads.length} buổi học giống tuần trước` });
      setCopyPreviewOpen(false);
      setCopyPreviewItems([]);
      handleFormSuccess();
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : 'Không thể tạo lịch';
      toast({ variant: 'error', title: 'Lỗi', description });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Lịch học</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các buổi học của lớp
          </p>
        </div>
      </div>

      <SessionList
        key={refreshKey}
        classId={classId}
        onCreateSession={handleCreateSession}
        onCreateSeries={handleCreateSeries}
        onEditSession={handleEditSession}
      />

      <SessionForm
        open={showSessionForm}
        onClose={handleCloseSessionForm}
        onSuccess={handleFormSuccess}
        classId={classId}
        editingSession={editingSession}
        defaultFeePerSession={defaultFeePerSession}
      />

      <SessionSeriesForm
        open={showSeriesForm}
        onClose={handleCloseSeriesForm}
        onSuccess={handleFormSuccess}
        classId={classId}
        defaultFeePerSession={defaultFeePerSession}
      />

      {/* Options dialog for series creation */}
      <Dialog open={showSeriesOptions} onOpenChange={() => setShowSeriesOptions(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Chọn cách tạo lịch học</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Vui lòng chọn một trong hai cách sau:</p>
            <div className="grid gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setShowSeriesOptions(false);
                  setShowSeriesForm(true);
                }}
              >
                Tự tạo lịch học (chọn ngày trong tuần)
              </Button>
              <Button variant="outline" onClick={handleCopyLastWeek}>
                Tạo giống với tuần trước
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeriesOptions(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog for copy last week */}
      <Dialog open={copyPreviewOpen} onOpenChange={() => setCopyPreviewOpen(false)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Xem trước buổi học sẽ tạo</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2 text-sm">
            {copyPreviewItems.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <div className="font-medium">{formatDate(it.startTime)} • {formatTime(it.startTime)}</div>
                  {it.notes && <div className="text-xs text-gray-400 truncate max-w-[320px]" title={it.notes || ''}>{it.notes}</div>}
                </div>
                <div className="text-right text-xs text-gray-300">
                  Thời lượng: {formatDuration(it.durationMin)}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyPreviewOpen(false)}>Hủy</Button>
            <Button onClick={confirmCreateFromPreview}>Xác nhận tạo {copyPreviewItems.length} buổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}