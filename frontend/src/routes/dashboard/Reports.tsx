import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Calendar, FileText, RefreshCw } from "lucide-react";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import MonthlyReportView from "../../components/reports/MonthlyReportView";
import MonthlyReportFilters from "../../components/reports/MonthlyReportFilters";
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
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    const loadReport = async () => {
      try {
        setIsLoadingReport(true);
        setError(null);
        const reportData = await reportsService.getMonthlyReport(
          selectedClassId, 
          selectedMonth, 
          includeStudentDetails,
          forceRefresh
        );
        setReport(reportData);
      } catch (err) {
        console.error('Failed to load report:', err);
        setError((err as Error).message || 'Không thể tải báo cáo');
        setReport(null);
      } finally {
        setIsLoadingReport(false);
        setForceRefresh(false); // Reset force refresh flag
      }
    };

    loadReport();
  }, [selectedClassId, selectedMonth, includeStudentDetails, forceRefresh]);

  const handleForceRefresh = () => {
    setForceRefresh(true);
  };

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
                onClick={handleForceRefresh}
                disabled={isLoadingReport || forceRefresh}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingReport || forceRefresh) ? 'animate-spin' : ''}`} />
                Làm mới báo cáo
              </Button>
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