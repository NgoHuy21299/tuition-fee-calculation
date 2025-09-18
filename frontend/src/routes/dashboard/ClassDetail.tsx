import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import ClassForm, {
  type ClassFormValues,
} from "../../components/classes/ClassForm";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import BackNavigation from "../../components/commons/BackNavigation";
import { classService, type ClassDTO } from "../../services/classService";
import { useToast } from "../../components/commons/Toast";
import LoadingSpinner from "../../components/commons/LoadingSpinner";
import { studentService, type StudentDTO } from "../../services/studentService";
import { classStudentService } from "../../services/classStudentService";
import { Input } from "../../components/ui/input";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ClassDTO | null>(null);
  const [tab, setTab] = useState<"overview" | "students" | "sessions">(
    "overview"
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Students tab state
  const [stuLoading, setStuLoading] = useState(true);
  const [stuItems, setStuItems] = useState<StudentDTO[]>([]);
  const [stuTotal, setStuTotal] = useState(0);
  const [q, setQ] = useState("");
  // Minimum spinner to avoid flicker
  const MIN_SPINNER_MS = 300;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const start = Date.now();
      try {
        const data = await classService.getClass(id);
        setItem(data);
      } catch (err: unknown) {
        let message = "Tải dữ liệu lớp thất bại";
        if (typeof err === "object" && err !== null) {
          const anyErr = err as {
            response?: { data?: { error?: string } };
            message?: string;
          };
          message = anyErr.response?.data?.error || anyErr.message || message;
        }
        toast({ title: "Lỗi", description: message, variant: "error" });
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_SPINNER_MS) await delay(MIN_SPINNER_MS - elapsed);
        setLoading(false);
      }
    }
    load();
  }, [id, toast]);

  // Read preferred tab from navigation state (e.g., back from StudentEdit)
  useEffect(() => {
    const st = location.state as { tab?: "overview" | "students" | "sessions"; backTab?: "overview" | "students" | "sessions" } | null;
    const preferred = st?.tab || st?.backTab;
    if (preferred) setTab(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Load students for this class (students tab)
  async function loadStudents() {
    if (!id) return;
    setStuLoading(true);
    const start = Date.now();
    try {
      const { items, total } = await studentService.listStudents({ classId: id });
      setStuItems(items);
      setStuTotal(total);
    } catch (err: unknown) {
      let description = "Tải danh sách học sinh thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        description = anyErr.response?.data?.error || anyErr.message || description;
      }
      toast({ title: "Lỗi", description, variant: "error" });
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPINNER_MS) await delay(MIN_SPINNER_MS - elapsed);
      setStuLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "students") {
      loadStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stuItems.slice();
    return stuItems.filter((s) => {
      const mix = [s.name ?? "", s.phone ?? ""].join(" ").toLowerCase();
      return mix.includes(term);
    });
  }, [stuItems, q]);

  async function onRemoveStudent(studentId: string) {
    if (!id) return;
    try {
      // Fetch detail to find active membership for this class
      const detail = await studentService.getStudent(studentId);
      const active = (detail.classes || []).find((c) => c.id === id && c.leftAt == null);
      if (!active) {
        toast({ variant: "warning", title: "Chú ý", description: "Học sinh không còn là thành viên lớp." });
        await loadStudents();
        return;
      }
      const nowIso = new Date().toISOString();
      await classStudentService.leaveStudentFromClass(id, active.classStudentId, nowIso);
      toast({ variant: "success", title: "Thành công", description: "Đã xoá học sinh khỏi lớp" });
      await loadStudents();
    } catch (err: unknown) {
      let description = "Xoá học sinh khỏi lớp thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        description = anyErr.response?.data?.error || anyErr.message || description;
      }
      toast({ variant: "error", title: "Lỗi", description });
    }
  }

  async function onSubmit(values: ClassFormValues) {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await classService.updateClass(id, values);
      setItem(updated);
      toast({
        title: "Đã lưu",
        description: "Cập nhật lớp thành công",
        variant: "success",
      });
    } catch (err: unknown) {
      let description = "Cập nhật lớp thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        description =
          anyErr.response?.data?.error || anyErr.message || description;
      }
      toast({ title: "Lỗi", description, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive() {
    if (!id || !item) return;
    setSaving(true);
    try {
      const updated = await classService.updateClass(id, {
        isActive: !item.isActive,
      });
      setItem(updated);
      toast({
        title: "Thành công",
        description: updated.isActive
          ? "Đã bật hoạt động"
          : "Đã ngừng hoạt động",
        variant: "success",
      });
    } catch (err: unknown) {
      let description = "Cập nhật trạng thái thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        description =
          anyErr.response?.data?.error || anyErr.message || description;
      }
      toast({ title: "Lỗi", description, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    try {
      await classService.deleteClass(id);
      toast({
        title: "Đã xóa",
        description: "Xóa lớp thành công",
        variant: "success",
      });
      navigate("/dashboard/classes");
    } catch (err: unknown) {
      let description = "Xóa lớp thất bại";
      let variant: "error" | "warning" = "error";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as {
          response?: { data?: { code?: string; error?: string } };
        };
        const code = anyErr.response?.data?.code;
        if (code === "CLASS_HAS_STUDENTS" || code === "CLASS_HAS_SESSIONS") {
          variant = "warning";
          description =
            "Không thể xoá lớp vì còn học sinh hoặc buổi học. Vui lòng xoá/di chuyển dữ liệu trước.";
        } else {
          description = anyErr.response?.data?.error || description;
        }
      }
      toast({ title: "Không thể xoá", description, variant });
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackNavigation to="/dashboard/classes" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lớp {item?.name ?? ""}</h1>
          <p className="text-sm text-gray-400">
            Xem và chỉnh sửa thông tin lớp học
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={item?.isActive ? "danger" : "success"}
            onClick={onToggleActive}
            disabled={!item || saving}
          >
            {item?.isActive ? "Ngừng hoạt động" : "Bật hoạt động"}
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
          >
            Xoá
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 pt-3">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Tổng quan
          </TabButton>
          <TabButton
            active={tab === "students"}
            onClick={() => setTab("students")}
          >
            Học viên
          </TabButton>
          <TabButton
            active={tab === "sessions"}
            onClick={() => setTab("sessions")}
          >
            Buổi học
          </TabButton>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center overflow-hidden">
              <LoadingSpinner size={32} padding={6} />
            </div>
          ) : tab === "overview" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Thông tin lớp</h2>
                {item && (
                  <p className="text-sm text-gray-400">
                    Tạo lúc: {formatLocal(item.createdAt)}
                  </p>
                )}
              </div>
              {item && (
                <ClassForm
                  initialValues={{
                    name: item.name,
                    subject: item.subject,
                    description: item.description,
                    defaultFeePerSession: item.defaultFeePerSession,
                    isActive: item.isActive,
                  }}
                  onSubmit={onSubmit}
                  submitText="Lưu thay đổi"
                  disabled={saving}
                />
              )}
            </div>
          ) : tab === "students" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm kiếm... (Tên, SĐT)"
                  className="w-64"
                />
                <Button
                  onClick={() => {
                    if (!item || !id) return;
                    navigate("/dashboard/students/new", {
                      state: {
                        preselectSelectedClasses: [{ label: item.name, value: item.id }],
                        backTo: `/dashboard/classes/${id}`,
                        backTab: "students",
                      },
                    });
                  }}
                >
                  Tạo học sinh
                </Button>
              </div>

              <div className="overflow-x-auto">
                {stuLoading ? (
                  <div className="flex justify-center overflow-hidden">
                    <LoadingSpinner size={32} padding={6} />
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="py-2 pr-3 font-medium">Tên</th>
                        <th className="py-2 pr-3 font-medium">Điện thoại</th>
                        <th className="py-2 pr-3 font-medium text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-400">
                            Không có học sinh nào
                          </td>
                        </tr>
                      ) : (
                        filtered.map((s) => (
                          <tr key={s.id} className="border-t border-gray-800">
                            <td className="py-2 pr-3">
                              <div className="font-medium">{s.name}</div>
                            </td>
                            <td className="py-2 pr-3">{s.phone || "-"}</td>
                            <td className="py-2 pr-0 text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button variant="outline" onClick={() => navigate(`/dashboard/students/${s.id}/edit`, { state: { backTo: `/dashboard/classes/${id}`, backTab: "students" } })}>
                                  Sửa
                                </Button>
                                <Button variant="danger" onClick={() => onRemoveStudent(s.id)}>
                                  Xoá khỏi lớp
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">
                  Tổng: {filtered.length} học sinh. (Đã tải {stuTotal} từ server)
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Danh sách buổi học sẽ được bổ sung ở UC-04.
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá lớp"
        description="Bạn có chắc muốn xoá lớp này? Hành động không thể hoàn tác."
        confirmText="Xoá"
        confirmVariant="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-2 text-sm border-b-2 -mb-px",
        active
          ? "border-white text-white"
          : "border-transparent text-gray-400 hover:text-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatLocal(dt: string) {
  const d = new Date(dt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
