import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import type { ClassDTO } from "../../services/classService";

interface MonthlyReportFiltersProps {
  classes: ClassDTO[];
  selectedClassId: string;
  selectedMonth: string;
  includeStudentDetails: boolean;
  onClassChange: (classId: string) => void;
  onMonthChange: (month: string) => void;
  onDetailsToggleChange: (include: boolean) => void;
}

export default function MonthlyReportFilters({
  classes,
  selectedClassId,
  selectedMonth,
  includeStudentDetails,
  onClassChange,
  onMonthChange,
  onDetailsToggleChange
}: MonthlyReportFiltersProps) {
  // Generate month options (current month and previous 11 months)
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = month.toString().padStart(2, '0');
      const value = `${year}-${monthStr}`;
      const label = date.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      months.push({ value, label });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="class-select">Lớp học</Label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={(e) => onClassChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Chọn lớp học</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name} - {classItem.subject || 'Chưa có môn học'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="month-select">Tháng</Label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Chọn tháng</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Tùy chọn</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-details"
            checked={includeStudentDetails}
            onCheckedChange={(checked) => onDetailsToggleChange(checked === true)}
          />
          <Label htmlFor="include-details" className="text-sm font-normal">
            Hiển thị chi tiết từng buổi học
          </Label>
        </div>
      </div>
    </div>
  );
}