import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SessionService, type SessionDto } from "../../services/sessionService";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Ban,
  UserCheck,
} from "lucide-react";
import {
  formatDate,
  formatTime,
  formatDuration,
} from "../../utils/dateHelpers";
import LoadingSpinner from "../commons/LoadingSpinner";

interface SessionListProps {
  classId: string;
  onCreateSession?: () => void;
  onCreateSeries?: () => void;
  onEditSession?: (session: SessionDto) => void;
}

const statusColors: Record<SessionDto["status"], string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  canceled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<SessionDto["status"], string> = {
  scheduled: "Đã lên lịch",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
};

export function SessionList({
  classId,
  onCreateSession,
  onCreateSeries,
  onEditSession,
}: SessionListProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "completed" | "canceled" | "this_week" | "upcoming" | "this_month"
  >("this_month");

  // Minimum spinner to avoid flicker
  const MIN_SPINNER_MS = 300;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const data = await SessionService.listSessions(classId);
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPINNER_MS) await delay(MIN_SPINNER_MS - elapsed);
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy buổi học này?")) {
      return;
    }

    try {
      await SessionService.cancelSession(sessionId);
      await loadSessions(); // Refresh list
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể hủy buổi học";
      alert("Lỗi: " + errorMessage);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa buổi học này? Hành động này không thể hoàn tác."
      )
    ) {
      return;
    }

    try {
      await SessionService.deleteSession(sessionId);
      await loadSessions(); // Refresh list
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể xóa buổi học";
      alert("Lỗi: " + errorMessage);
    }
  };

  // Helpers for time filtering
  const now = new Date();
  const getWeekRange = (ref: Date) => {
    const start = new Date(ref);
    // Week starts on Monday
    const day = start.getDay(); // 0=Sun,1=Mon,...
    const diffToMonday = (day === 0 ? -6 : 1) - day; // move to Monday
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const isThisWeek = (iso: string) => {
    const d = new Date(iso);
    const { start, end } = getWeekRange(now);
    return d >= start && d <= end;
  };

  // Helpers for month filtering
  const getMonthRange = (ref: Date) => {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  const isThisMonth = (iso: string) => {
    const d = new Date(iso);
    const { start, end } = getMonthRange(now);
    return d >= start && d <= end;
  };

  const isUpcoming = (iso: string) => new Date(iso) > now;

  const filteredSessions = sessions.filter((session) => {
    // 'all' shows everything except canceled
    if (filter === "all") return session.status !== "canceled";
    if (filter === "this_month") return isThisMonth(session.startTime) && session.status !== "canceled";
    if (filter === "this_week")
      return isThisWeek(session.startTime) && session.status !== "canceled";
    if (filter === "upcoming")
      return isUpcoming(session.startTime) && session.status !== "canceled";
    return session.status === filter;
  });

  // Sort with status grouping: scheduled (Đã lên lịch) first, then completed, then canceled.
  // Within the same status, keep previous logic: startTime desc, then createdAt desc.
  const statusOrder: Record<SessionDto["status"], number> = {
    scheduled: 0,
    completed: 1,
    canceled: 2,
  };

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const so = statusOrder[a.status] - statusOrder[b.status];
    if (so !== 0) return so;
    const at = new Date(a.startTime).getTime();
    const bt = new Date(b.startTime).getTime();
    if (bt !== at) return bt - at;
    const ac = new Date(a.createdAt).getTime();
    const bc = new Date(b.createdAt).getTime();
    return bc - ac;
  });

  if (loading) {
    return (
      <div className="flex justify-center overflow-hidden">
        <LoadingSpinner size={32} padding={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header với actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === "this_month" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("this_month")}
          >
            Tháng này (
            {sessions.filter((s) => s.status !== "canceled" && isThisMonth(s.startTime)).length}
            )
          </Button>
          <Button
            variant={filter === "this_week" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("this_week")}
          >
            Tuần này (
            {
              sessions.filter(
                (s) => s.status !== "canceled" && isThisWeek(s.startTime)
              ).length
            }
            )
          </Button>
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            Sắp tới (
            {
              sessions.filter(
                (s) => s.status !== "canceled" && isUpcoming(s.startTime)
              ).length
            }
            )
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Hoàn thành (
            {sessions.filter((s) => s.status === "completed").length})
          </Button>
          <Button
            variant={filter === "canceled" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("canceled")}
          >
            Đã hủy ({sessions.filter((s) => s.status === "canceled").length})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tất cả ({sessions.filter((s) => s.status !== "canceled").length})
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
      {sortedSessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === "all" &&
            "Chưa có buổi học nào (trừ đã hủy). Tạo buổi học đầu tiên?"}
          {filter === "completed" &&
            `Không có buổi học nào ở trạng thái "${statusLabels.completed}"`}
          {filter === "canceled" &&
            `Không có buổi học nào ở trạng thái "${statusLabels.canceled}"`}
          {filter === "this_week" && "Tuần này chưa có buổi học nào."}
          {filter === "upcoming" && "Chưa có buổi học sắp tới."}
          {filter === "this_month" && "Tháng này chưa có buổi học nào."}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {`${formatTime(session.startTime)} - ${formatDate(
                          session.startTime
                        )}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(session.durationMin)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[session.status]}
                    >
                      {statusLabels[session.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={session.notes || ""}>
                      {session.notes
                        ? (session.notes.split('\n')[0] || '').trim()
                        : <span className="text-gray-400">—</span>
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/attendance/${session.id}`, {
                            state: {
                              backTo: `/dashboard/classes/${classId}`,
                              backTab: "sessions",
                            },
                          })
                        }
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Điểm danh
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={
                              session.status === "completed"
                                ? undefined
                                : () => onEditSession?.(session)
                            }
                            disabled={session.status === "completed"}
                            className="data-[disabled]:cursor-not-allowed"
                            title={
                              session.status === "completed"
                                ? "Không thể chỉnh sửa buổi học đã hoàn thành"
                                : undefined
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          {/* Always show Cancel, but disable when not scheduled */}
                          <DropdownMenuItem
                            onClick={
                              session.status !== "scheduled"
                                ? undefined
                                : () => handleCancelSession(session.id)
                            }
                            disabled={session.status !== "scheduled"}
                            className="data-[disabled]:cursor-not-allowed"
                            title={
                              session.status === "completed"
                                ? "Không thể hủy buổi học đã hoàn thành"
                                : session.status === "canceled"
                                ? "Buổi học đã được hủy"
                                : undefined
                            }
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Hủy buổi học
                          </DropdownMenuItem>
                          {session.status === "canceled" && (
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
                    </div>
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
