import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Calendar, FileText, RefreshCw } from "lucide-react";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import MonthlyReportView from "../../components/reports/MonthlyReportView";
import MonthlyReportFilters from "../../components/reports/MonthlyReportFilters";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import { classService } from "../../services/classService";
import { reportsService } from "../../services/reportsService";
import type { ClassDTO } from "../../services/classService";
import type { MonthlyReport } from "../../services/reportsService";

export default function Reports() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [includeStudentDetails, setIncludeStudentDetails] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  // States for manual loading management
  const [classes, setClasses] = useState<ClassDTO[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [reports, setReports] = useState<MonthlyReport[] | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmRecalcOpen, setConfirmRecalcOpen] = useState(false);
  // Minimum spinner time to avoid flicker
  const MIN_SPINNER_MS = 300;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setIsLoadingClasses(true);
        const response = await classService.listClasses({ isGetAll: true });
        setClasses(response.items);
      } catch (err) {
        console.error('Failed to load classes:', err);
        setError('Không thể tải danh sách lớp học');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // Load report when parameters change
  useEffect(() => {
    if (!selectedClassId || !selectedMonth) {
      setReport(null);
      setReports(null);
      return;
    }

    const loadReport = async () => {
      const start = Date.now();
      try {
        setIsLoadingReport(true);
        setError(null);
        // If ALL selected, fetch per-class reports and collect
        if (selectedClassId === 'ALL') {
          const allReports: MonthlyReport[] = [];
          for (const cls of classes) {
            try {
              const r = await reportsService.getMonthlyReport(cls.id, convertMonthGetReport(selectedMonth), includeStudentDetails, forceRefresh);
              allReports.push(r);
            } catch {
              // treat no-data or error as empty report with zeros
              allReports.push({
                classInfo: { id: cls.id, name: cls.name, subject: cls.subject || '' },
                month: selectedMonth,
                summary: { totalSessions: 0, totalParticipatingStudents: 0, totalFees: 0 },
                students: [],
              });
            }
          }
          setReports(allReports);
          setReport(null);
        } else {
          const reportData = await reportsService.getMonthlyReport(
            selectedClassId,
            convertMonthGetReport(selectedMonth),
            includeStudentDetails,
            forceRefresh
          );
          setReport(reportData);
          setReports(null);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
        // For errors at outer level, show a neutral empty state instead of red error
        setError(null);
        setReport(null);
        setReports(null);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_SPINNER_MS) {
          await delay(MIN_SPINNER_MS - elapsed);
        }
        setIsLoadingReport(false);
        setForceRefresh(false); // Reset force refresh flag
      }
    };

    loadReport();
  }, [selectedClassId, selectedMonth, includeStudentDetails, forceRefresh, reloadKey, classes]);

  const handleForceRefresh = () => {
    setForceRefresh(true);
  };

  const handleRefresh = () => {
    // simple re-fetch without forcing a full recompute
    setReloadKey((k) => k + 1);
  };

  const handleRecalcConfirm = () => {
    // called when user confirms recalculation
    setConfirmRecalcOpen(false);
    setForceRefresh(true);
  };

  const convertMonthGetReport = (selectedMonth: string) => {
    const yearMonthRegex = /^\d{4}-\d{2}$/;
    const monthRegex = /^\d{2}$/;
    const yearRegex = /^\d{4}$/;
    if (yearMonthRegex.test(selectedMonth)) return selectedMonth;
    const split = selectedMonth.split('-');
    if (split.length === 2 && monthRegex.test(split[0]) && yearRegex.test(split[1])) return `${split[1]}-${split[0]}`
    return selectedMonth;
  }

  if (isLoadingClasses) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Báo cáo theo tháng</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lọc báo cáo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyReportFilters
            classes={classes}
            selectedClassId={selectedClassId}
            selectedMonth={selectedMonth}
            includeStudentDetails={includeStudentDetails}
            onClassChange={setSelectedClassId}
            onMonthChange={setSelectedMonth}
            onDetailsToggleChange={setIncludeStudentDetails}
          />

          {selectedClassId && selectedMonth && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={() => handleRefresh()}
                disabled={isLoadingReport}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingReport ? 'animate-spin' : ''}`} />
                Làm mới báo cáo
              </Button>

              <Button
                onClick={() => setConfirmRecalcOpen(true)}
                disabled={isLoadingReport || forceRefresh}
                variant="warning"
                size="sm"
              >
                Tính toán lại báo cáo
              </Button>

              <ConfirmDialog
                open={confirmRecalcOpen}
                title="Tính toán lại báo cáo"
                description="Yêu cầu này sẽ buộc hệ thống tính toán lại báo cáo (dùng khi bạn vừa cập nhật buổi học). Bạn có chắc muốn tiếp tục?"
                confirmText="Tính toán lại"
                cancelText="Hủy"
                loading={isLoadingReport || forceRefresh}
                confirmVariant="danger"
                onConfirm={handleRecalcConfirm}
                onCancel={() => setConfirmRecalcOpen(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClassId && selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo tháng {selectedMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Không thể tải báo cáo: {error}</p>
                <Button onClick={handleForceRefresh} variant="outline">
                  Thử lại
                </Button>
              </div>
            ) : report ? (
              <MonthlyReportView
                report={report}
                includeDetails={includeStudentDetails}
              />
            ) : reports ? (
              <div className="space-y-6">
                {reports.map((r) => (
                  <div key={r.classInfo.id}>
                    <Card>
                      <CardContent>
                        <MonthlyReportView report={r} includeDetails={includeStudentDetails} />
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Chọn lớp học và tháng để xem báo cáo
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}