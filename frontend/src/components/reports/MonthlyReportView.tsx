import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, Users, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import type { MonthlyReport } from "../../services/reportsService";
import type { AttendanceStatus } from "../../constants";
import { ATTENDANCE_STATUS } from "../../constants";
import { formatUTCDateToLocal } from "../../utils/dateHelpers";

interface MonthlyReportViewProps {
  report: MonthlyReport;
  includeDetails: boolean;
  showStudentDetailsSection?: boolean;
}

export default function MonthlyReportView({ report, includeDetails, showStudentDetailsSection = true }: MonthlyReportViewProps) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleStudentExpansion = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return formatUTCDateToLocal(dateStr);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    return status === ATTENDANCE_STATUS.PRESENT ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Có mặt</Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Muộn</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Class Info & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600">Lớp học</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold pb-2">{report.classInfo.name}</div>
            <p className="text-xs text-gray-500">{report.classInfo.subject}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tổng buổi học
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold pb-2">{report.summary.totalSessions}</div>
            <p className="text-xs text-gray-500">buổi trong tháng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Học sinh tham gia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold pb-2">{report.summary.totalParticipatingStudents}</div>
            <p className="text-xs text-gray-500">học sinh có tham gia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tổng học phí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold pb-2">{formatCurrency(report.summary.totalFees)}</div>
            <p className="text-xs text-gray-500">trong tháng {report.month}</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Details */}
      {showStudentDetailsSection && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết theo học sinh</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học sinh</TableHead>
                  <TableHead className="text-center">Số buổi tham gia</TableHead>
                  <TableHead className="text-center">Tổng học phí</TableHead>
                  {includeDetails && <TableHead className="text-center">Chi tiết</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.students.map((student) => (
                  <>
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell className="text-center">{student.totalSessionsAttended}</TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(student.totalFees)}
                      </TableCell>
                      {includeDetails && (
                        <TableCell className="text-center">
                          {student.attendanceDetails && student.attendanceDetails.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStudentExpansion(student.studentId)}
                            >
                              {expandedStudents.has(student.studentId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    
                    {/* Expanded Details */}
                    {includeDetails && 
                     expandedStudents.has(student.studentId) && 
                     student.attendanceDetails && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-gray-950 p-0">
                          <div className="p-4 text-sm text-slate-200">
                            <h4 className="font-medium mb-3 text-slate-100">Chi tiết buổi học của {student.studentName}</h4>
                            <div className="space-y-2">
                              {student.attendanceDetails.map((detail, index) => (
                                <div 
                                  key={detail.sessionId} 
                                  className="flex items-center justify-between p-3 bg-gray-950 rounded border border-slate-700 text-sm"
                                >
                                  <div className="flex items-center gap-4 text-slate-100">
                                    <span>Buổi {index + 1}</span>
                                    <span className="opacity-80">{formatDate(detail.date)}</span>
                                    {getStatusBadge(detail.status)}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-slate-100">{formatCurrency(detail.calculatedFee)}</span>
                                    <div className="text-xs text-slate-400">
                                      {detail.feeBreakdown.attendanceOverride ? (
                                        <span>Override riêng</span>
                                      ) : detail.feeBreakdown.classOverride ? (
                                        <span>Phí lớp riêng</span>
                                      ) : (
                                        <span>Phí buổi học</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>

            {report.students.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Không có học sinh nào tham gia trong tháng này
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}