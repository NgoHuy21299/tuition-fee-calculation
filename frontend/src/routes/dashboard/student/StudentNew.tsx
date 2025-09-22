import BackNavigation from "../../../components/commons/BackNavigation";
import { Card } from "../../../components/ui/card";
import StudentForm from "../../../components/students/StudentForm";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LoadingSpinner from "../../../components/commons/LoadingSpinner";
import { classService } from "../../../services/classService";
import type { Option } from "../../../components/ui/multiple-selector";

export default function StudentNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { classOptions?: Option[]; preselectSelectedClasses?: Option[]; backTo?: string; backTab?: string } | null) ?? null;
  const passedOptions = (state?.classOptions ?? []) as Option[];
  const preselectSelectedClasses = (state?.preselectSelectedClasses ?? []) as Option[];
  const backTo = state?.backTo;
  const backTab = state?.backTab;
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classOptions, setClassOptions] = useState<Option[]>(passedOptions);

  const handleSaved = () => {
    if (backTo) {
      navigate(backTo, { state: { tab: backTab || "students" } });
    } else {
      navigate("/dashboard/students");
    }
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
    if (passedOptions.length === 0) {
      void fetchClasses();
    }
    return () => {
      mounted = false;
    };
  }, [passedOptions.length]);

  return (
    <div className="space-y-4">
      <BackNavigation to={backTo || "/dashboard/students"} state={backTab ? { tab: backTab } : undefined} />
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
            preselectSelectedClasses={preselectSelectedClasses}
          />
        </div>
      </Card>
    </div>
  );
}

