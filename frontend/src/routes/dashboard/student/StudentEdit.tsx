import BackNavigation from "../../../components/commons/BackNavigation";
import { Card } from "../../../components/ui/card";
import StudentForm from "../../../components/students/StudentForm";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Option } from "../../../components/ui/multiple-selector";
import { classService } from "../../../services/classService";
import LoadingSpinner from "../../../components/commons/LoadingSpinner";

export default function StudentEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const st = (location.state as { backTo?: string; backTab?: string } | null) || null;
  const backTo = st?.backTo;
  const backTab = st?.backTab;
  const passedOptions =
    ((location.state as { classOptions?: Option[] } | null)?.classOptions ?? []) as Option[];
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classOptions, setClassOptions] = useState<Option[]>(passedOptions);
  const [formLoading, setFormLoading] = useState(false);

  const handleSaved = () => {
    if (backTo) navigate(backTo, { state: { tab: backTab || "students" } });
    else navigate("/dashboard/students");
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
          <h1 className="text-xl font-semibold">Chỉnh sửa học sinh</h1>
          <p className="text-sm text-gray-400">Cập nhật thông tin học sinh.</p>
        </div>
        <div>{loadingClasses && <LoadingSpinner size={18} padding={3} />}</div>
      </div>
      <Card variant="blur-animation">
        <div className="p-4 relative">
          {/* Card-level loading overlay when student form is fetching */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${formLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg" />
            <div className="relative z-10">
              <LoadingSpinner size={36} padding={6} />
            </div>
          </div>
          <StudentForm editingId={id ?? null} onSaved={handleSaved} classOptions={classOptions} onLoadingChange={setFormLoading} />
        </div>
      </Card>
    </div>
  );
}
