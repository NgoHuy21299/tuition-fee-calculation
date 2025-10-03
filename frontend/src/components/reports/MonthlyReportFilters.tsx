import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import type { ClassDTO } from "../../services/classService";

// Helper to produce the label shown in the class dropdown trigger
const getClassLabel = (classes: ClassDTO[], selectedClassId: string) => {
  if (selectedClassId === 'ALL') return 'Tất cả các lớp';
  if (selectedClassId === 'AD_HOC') return 'Lớp học riêng';
  if (!selectedClassId) return 'Chọn lớp học';
  const cls = classes.find((c) => c.id === selectedClassId);
  if (!cls) return 'Chọn lớp học';
  return cls.subject ? `${cls.name} - ${cls.subject}` : cls.name;
};

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
      const value = `${monthStr}-${year}`;
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button className="w-full text-left" variant="outline">
                {getClassLabel(classes, selectedClassId)}
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            <DropdownMenuItem>
              <button
                className="w-full text-left"
                onClick={() => onClassChange('')}
              >
                Chọn lớp học
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                className="w-full text-left"
                onClick={() => onClassChange('ALL')}
              >
                Tất cả các lớp
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button
                className="w-full text-left"
                onClick={() => onClassChange('AD_HOC')}
              >
                Lớp học riêng
              </button>
            </DropdownMenuItem>
            {classes.map((classItem) => (
              <DropdownMenuItem key={classItem.id}>
                <button
                  className="w-full text-left"
                  onClick={() => onClassChange(classItem.id)}
                >
                  {classItem.name} - {classItem.subject || 'Chưa có môn học'}
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label htmlFor="month-select">Tháng</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full text-left" variant="outline">
              {selectedMonth
                ? (monthOptions.find((m) => m.value === selectedMonth)?.label ?? 'Chọn tháng')
                : 'Chọn tháng'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            <DropdownMenuItem>
              <button className="w-full text-left" onClick={() => onMonthChange('')}>Chọn tháng</button>
            </DropdownMenuItem>
            {monthOptions.map((month) => (
              <DropdownMenuItem key={month.value}>
                <button className="w-full text-left" onClick={() => onMonthChange(month.value)}>
                  {month.label}
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Label>Tùy chọn</Label>
        <div className="flex items-center space-x-2 pt-3">
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