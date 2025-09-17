import BackNavigation from "../../components/commons/BackNavigation";
import { Card } from "../../components/ui/card";
import StudentForm from "../../components/students/StudentForm";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import { classService } from "../../services/classService";
import type { Option } from "../../components/ui/multiple-selector";

// Reuses the same field behaviors as modal StudentForm but in a page layout
export default function StudentNew() {
  const navigate = useNavigate();
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classOptions, setClassOptions] = useState<Option[]>([]);

  const handleSaved = () => {
    navigate("/dashboard/students");
  };

  useEffect(() => {
    let mounted = true;
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await classService.listClasses({ isGetAll: false, isActive: true });
        if (!mounted) return;
        const options: Option[] = res.items.map((c) => ({ label: c.name, value: c.id }));
        setClassOptions(options);
      } catch (e) {
        // silent fail; form can still be used without classes
        console.log("Failed to load classes: ", e);
      } finally {
        if (mounted) setLoadingClasses(false);
      }
    };
    void fetchClasses();
    return () => {
      mounted = false;
    };
  }, []);

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
        <div>
          {loadingClasses && <LoadingSpinner size={18} padding={3} />}
        </div>
      </div>
      <Card>
        <div className="p-4">
          <StudentForm
            editingId={null}
            onSaved={handleSaved}
            classOptions={classOptions}
          />
        </div>
      </Card>
    </div>
  );
}

