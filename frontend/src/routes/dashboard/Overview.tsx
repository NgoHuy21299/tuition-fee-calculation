import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/calendar-custom.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { CalendarIcon, Plus, RefreshCw } from "lucide-react";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import OverviewStats from "../../components/dashboard/OverviewStats";
import { Lock } from "lucide-react";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import { SessionService } from "../../services/sessionService";
import { classService } from "../../services/classService";
import { studentService } from "../../services/studentService";
import { reportsService } from "../../services/reportsService";
import { SessionForm } from "../../components/sessions/SessionForm";
import type { SessionDto } from "../../services/sessionService";
import { useNavigate } from "react-router-dom";
import { PrivateSessionForm } from "../../components/sessions";

// Setup localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Configure moment to Vietnamese with Monday as first day of week
moment.locale("vi", {
  months:
    "Tháng 1_Tháng 2_Tháng 3_Tháng 4_Tháng 5_Tháng 6_Tháng 7_Tháng 8_Tháng 9_Tháng 10_Tháng 11_Tháng 12".split(
      "_"
    ),
  monthsShort:
    "Th01_Th02_Th03_Th04_Th05_Th06_Th07_Th08_Th09_Th10_Th11_Th12".split("_"),
  weekdays: "Chủ nhật_Thứ hai_Thứ ba_Thứ tư_Thứ năm_Thứ sáu_Thứ bảy".split("_"),
  weekdaysShort: "CN_T2_T3_T4_T5_T6_T7".split("_"),
  weekdaysMin: "CN_T2_T3_T4_T5_T6_T7".split("_"),
  week: {
    dow: 1, // Monday is the first day of the week
    doy: 4, // The week that contains Jan 4th is the first week of the year
  },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: SessionDto;
}

export default function DashboardOverview() {
  // State cho bảo mật doanh thu
  const [showRevenue, setShowRevenue] = useState(false);
  // In browser environments setTimeout returns a number, so use number | null here
  const revenueTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSessionTypeDialog, setShowSessionTypeDialog] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showPrivateSessionForm, setShowPrivateSessionForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Confirm dialog + loading for forcing revenue recalculation
  const [confirmRevenueRecalcOpen, setConfirmRevenueRecalcOpen] = useState(false);
  const [isRecalcRevenueLoading, setIsRecalcRevenueLoading] = useState(false);
  // Minimum spinner time for revenue recalc to avoid flicker
  const MIN_RECALC_SPINNER_MS = 500;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const loadSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const data = await SessionService.getAllSessions({ isIncludeCancelled: true });
      // Exclude canceled sessions from the overview calendar
      setSessions(data.filter((s) => s.status !== "canceled"));
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load sessions for calendar
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load stats (classes, students, monthly revenue)
  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoadingStats(true);

        // Load total classes
        const classesResponse = await classService.listClasses({
          isGetAll: false,
        });
        setTotalClasses(classesResponse.items.length);

        // Load total students
        const studentsResponse = await studentService.listStudents();
        setTotalStudents(studentsResponse.total);

        // Load monthly revenue for current month
        const currentMonth = moment().format("YYYY-MM");
        let totalRevenue = 0;

        // Fetch reports for all classes
        for (const cls of classesResponse.items) {
          try {
            const report = await reportsService.getMonthlyReport(
              cls.id,
              currentMonth,
              false,
              false
            );
            totalRevenue += report.summary.totalFees;
          } catch {
            // If no data for this class, continue
            continue;
          }
        }

        setMonthlyRevenue(totalRevenue);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  // Transform sessions to calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return sessions.map((session) => {
      const start = new Date(session.startTime);
      const end = new Date(start.getTime() + session.durationMin * 60000);

      return {
        id: session.id,
        title: session.className || "Buổi học riêng",
        start,
        end,
        resource: session,
      };
    });
  }, [sessions]);

  // Event style getter for calendar
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const session = event.resource;
    let backgroundColor = "#3b82f6"; // blue for scheduled

    if (session.status === "completed") {
      backgroundColor = "#10b981"; // green
    } else if (session.status === "canceled") {
      backgroundColor = "#ef4444"; // red
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      const session = event.resource;
      // Navigate to attendance page with state for back navigation
      navigate(`/dashboard/attendance/${session.id}`, {
        state: { from: "/dashboard/overview" },
      });
    },
    [navigate]
  );

  // Handle view change
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  // Handle date navigation
  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Handle create session from calendar
  const handleCreateSessionFromDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowSessionTypeDialog(true);
  }, []);

  // Bảo mật doanh thu: bấm vào mới hiện, tự động ẩn sau 30s
  const handleShowRevenue = useCallback(() => {
    setShowRevenue(true);
    if (revenueTimeoutRef.current) window.clearTimeout(revenueTimeoutRef.current);
    revenueTimeoutRef.current = window.setTimeout(() => {
      setShowRevenue(false);
      revenueTimeoutRef.current = null;
    }, 20000);
  }, []);

  // Confirmed recalc of monthly revenue (force recompute)
  const handleConfirmRecalcRevenue = async () => {
    setConfirmRevenueRecalcOpen(false);
    setIsRecalcRevenueLoading(true);
    const start = Date.now();
    try {
      // Fetch classes (non-paginated list)
      const classesResponse = await classService.listClasses({ isGetAll: false });
      const currentMonth = moment().format('YYYY-MM');
      let totalRevenue = 0;

      for (const cls of classesResponse.items) {
        try {
          const r = await reportsService.getMonthlyReport(cls.id, currentMonth, false, true);
          totalRevenue += r.summary.totalFees;
        } catch {
          // If a class has no data or fails, skip it
          continue;
        }
      }

      setMonthlyRevenue(totalRevenue);
    } catch {
      console.error('Failed to recalc monthly revenue');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_RECALC_SPINNER_MS) {
        await delay(MIN_RECALC_SPINNER_MS - elapsed);
      }
      setIsRecalcRevenueLoading(false);
    }
  };

  // Clear timeout on unmount to avoid setting state after unmount
  useEffect(() => {
    return () => {
      if (revenueTimeoutRef.current) {
        window.clearTimeout(revenueTimeoutRef.current);
        revenueTimeoutRef.current = null;
      }
    };
  }, []);

  // Allow hiding revenue early with Escape key while it's shown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showRevenue) {
        setShowRevenue(false);
        if (revenueTimeoutRef.current) {
          window.clearTimeout(revenueTimeoutRef.current);
          revenueTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showRevenue]);
  const handleSessionFormSuccess = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  // Custom DateCellWrapper to add "Create Session" button
  const DateCellWrapper = useCallback(
    ({ value, children }: { value: Date; children: React.ReactNode }) => {
      return (
        <div className="rbc-day-bg-wrapper">
          {children}
          <button
            className="rbc-add-session-btn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCreateSessionFromDate(value);
            }}
            title="Thêm lịch học"
            type="button"
          >
            <Plus style={{ width: "12px", height: "12px" }} />
            <span>Thêm lịch</span>
          </button>
        </div>
      );
    },
    [handleCreateSessionFromDate]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Theo dõi lịch học, thống kê lớp học và doanh thu
        </p>
      </div>

      {/* Stats Cards */}
      <OverviewStats
        totalClasses={totalClasses}
        totalStudents={totalStudents}
        monthlyRevenue={monthlyRevenue}
        isLoading={isLoadingStats}
        renderRevenueCard={({ value }: { value: number }) => (
            <Card
              className="relative cursor-pointer"
              onClick={() => {
                if (!showRevenue) handleShowRevenue();
              }}
              aria-label={showRevenue ? "Doanh thu" : "Bấm để xem doanh thu"}
              tabIndex={0}
            >
            {/* blurred overlay when hidden (intercepts clicks and reveals on click) */}
            <div
              className="absolute inset-0 flex items-center justify-center z-30 cursor-pointer"
              style={{
                display: showRevenue ? "none" : "flex",
              }}
              onClick={() => handleShowRevenue()}
              role="button"
              aria-label="Hiện doanh thu"
            >
              <Lock className="w-8 h-8 text-gray-400" />
            </div>

            <div
              className="relative"
              style={{
                filter: showRevenue ? "none" : "blur(6px)",
                transition: "filter 0.3s",
              }}
            >
              {/* Place refresh button inside blurred area so it gets blurred too */}
              <div className="absolute top-1 right-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmRevenueRecalcOpen(true);
                  }}
                  disabled={isRecalcRevenueLoading}
                  aria-label="Tính toán lại doanh thu"
                >
                  <RefreshCw className={`h-3 w-3 ${isRecalcRevenueLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Doanh thu tháng này
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <span className="text-emerald-600">₫</span>
                  </div>
                  <div>
                      <p className="text-3xl font-bold">
                        {isRecalcRevenueLoading ? (
                          <LoadingSpinner size={20} padding={4} />
                        ) : showRevenue ? (
                          <span>{value.toLocaleString("vi-VN")}₫</span>
                        ) : (
                          // Masked placeholder to fully hide the numeric amount while blurred
                          <span>₫</span>
                        )}
                      </p>
                    <p className="text-sm text-gray-500">Tính đến thời điểm hiện tại</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        )}
      />

      <ConfirmDialog
        open={confirmRevenueRecalcOpen}
        title="Tính toán lại doanh thu"
        description="Yêu cầu này sẽ buộc hệ thống tính toán lại doanh thu tháng này (dùng khi bạn vừa cập nhật buổi học). Bạn có chắc muốn tiếp tục?"
        confirmText="Tính toán lại"
        cancelText="Hủy"
        loading={isRecalcRevenueLoading}
        confirmVariant="danger"
        onConfirm={handleConfirmRecalcRevenue}
        onCancel={() => setConfirmRevenueRecalcOpen(false)}
      />

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Lịch buổi học
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span style={{background:'#10b981',width:14,height:14,borderRadius:3,display:'inline-block'}}></span>
                <span>Đã hoàn thành</span>
              </span>
              <span className="flex items-center gap-1">
                <span style={{background:'#3b82f6',width:14,height:14,borderRadius:3,display:'inline-block'}}></span>
                <span>Đã lên lịch</span>
              </span>
              {/* Cancelled legend removed from overview per UX request */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="h-[1000px]">
              <div style={{ height: "100%", minHeight: "1000px" }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleSelectEvent}
                  view={currentView}
                  onView={handleViewChange}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  popup
                  popupOffset={{ x: 10, y: 10 }}
                  showMultiDayTimes
                  step={60}
                  timeslots={1}
                  culture="vi"
                  messages={{
                    next: "Sau",
                    previous: "Trước",
                    today: "Hôm nay",
                    month: "Tháng",
                    week: "Tuần",
                    day: "Ngày",
                    agenda: "Lịch trình",
                    date: "Ngày",
                    time: "Thời gian",
                    event: "Sự kiện",
                    noEventsInRange:
                      "Không có buổi học nào trong khoảng thời gian này",
                    showMore: (total) => `+ Xem thêm ${total} buổi học`,
                  }}
                  components={{
                    dateCellWrapper: DateCellWrapper,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Type Selection Dialog */}
      <Dialog
        open={showSessionTypeDialog}
        onOpenChange={setShowSessionTypeDialog}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Chọn loại buổi học</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Vui lòng chọn loại buổi học bạn muốn tạo:</p>
            <div className="grid gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setShowSessionTypeDialog(false);
                  setShowSessionForm(true);
                }}
              >
                Buổi học cho lớp
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSessionTypeDialog(false);
                  setShowPrivateSessionForm(true);
                }}
              >
                Buổi học riêng
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSessionTypeDialog(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Forms */}
      <SessionForm
        open={showSessionForm}
        onClose={() => {
          setShowSessionForm(false);
          setSelectedDate(null);
        }}
        onSuccess={handleSessionFormSuccess}
        classId={undefined}
        editingSession={undefined}
        initialDate={selectedDate || undefined}
      />

      <PrivateSessionForm
        open={showPrivateSessionForm}
        onClose={() => {
          setShowPrivateSessionForm(false);
          setSelectedDate(null);
        }}
        onSuccess={handleSessionFormSuccess}
        initialDate={selectedDate || undefined}
      />
    </div>
  );
}
