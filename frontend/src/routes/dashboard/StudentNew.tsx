import BackNavigation from "../../components/commons/BackNavigation";
import { Card } from "../../components/ui/card";
import StudentForm from "../../components/students/StudentForm";
import { useNavigate } from "react-router-dom";

// Reuses the same field behaviors as modal StudentForm but in a page layout
export default function StudentNew() {
  const navigate = useNavigate();

  const handleSaved = () => {
    navigate("/dashboard/students");
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
            editingId={null}
            onSaved={handleSaved}
          />
        </div>
      </Card>
    </div>
  );
}
