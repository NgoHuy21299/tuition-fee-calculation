import { useState } from "react";
import BackNavigation from "../../components/commons/BackNavigation";
import { Card } from "../../components/ui/card";
import StudentForm from "../../components/students/StudentForm";

// Reuses the same field behaviors as modal StudentForm but in a page layout
export default function StudentNew() {
  const [open, setOpen] = useState(true);

  const handleSaved = () => {
    // navigate back to list after successful creation
    window.location.assign("/dashboard/students");
  };

  return (
    <div className="space-y-4">
      <BackNavigation to="/dashboard/students" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tạo học sinh mới</h1>
          <p className="text-sm text-gray-400">
            Nhập thông tin học sinh. Bạn có thể chỉnh sửa sau.
          </p>
        </div>
      </div>
      <Card>
        <div className="p-4">
          <StudentForm 
            open={open}
            editingId={null}
            onOpenChange={setOpen}
            onSaved={handleSaved}
          />
        </div>
      </Card>
    </div>
  );
}
