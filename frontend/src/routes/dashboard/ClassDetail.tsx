import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import ClassForm, { type ClassFormValues } from "../../components/dashboard/ClassForm";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import { classService, type ClassDTO } from "../../services/classService";
import { useToast } from "../../components/commons/Toast";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ClassDTO | null>(null);
  const [tab, setTab] = useState<"overview" | "students" | "sessions">("overview");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await classService.getClass(id);
        setItem(data);
      } catch (err: unknown) {
        let message = "Tải dữ liệu lớp thất bại";
        if (typeof err === "object" && err !== null) {
          const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
          message = anyErr.response?.data?.error || anyErr.message || message;
        }
        toast({ title: "Lỗi", description: message, variant: "error" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, toast]);

  async function onSubmit(values: ClassFormValues) {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await classService.updateClass(id, values);
      setItem(updated);
      toast({ title: "Đã lưu", description: "Cập nhật lớp thành công", variant: "success" });
    } catch (err: unknown) {
      let description = "Cập nhật lớp thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        description = anyErr.response?.data?.error || anyErr.message || description;
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
      const updated = await classService.updateClass(id, { isActive: !item.isActive });
      setItem(updated);
      toast({ title: "Thành công", description: updated.isActive ? "Đã bật hoạt động" : "Đã ngừng hoạt động", variant: "success" });
    } catch (err: unknown) {
      let description = "Cập nhật trạng thái thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        description = anyErr.response?.data?.error || anyErr.message || description;
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
      toast({ title: "Đã xóa", description: "Xóa lớp thành công", variant: "success" });
      navigate("/dashboard/classes");
    } catch (err: unknown) {
      let description = "Xóa lớp thất bại";
      let variant: "error" | "warning" = "error";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { code?: string; error?: string } } };
        const code = anyErr.response?.data?.code;
        if (code === "CLASS_HAS_STUDENTS" || code === "CLASS_HAS_SESSIONS") {
          variant = "warning";
          description = "Không thể xoá lớp vì còn học sinh hoặc buổi học. Vui lòng xoá/di chuyển dữ liệu trước.";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chi tiết lớp</h1>
          <p className="text-sm text-gray-400">Xem và chỉnh sửa thông tin lớp học.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggleActive} disabled={!item || saving}>
            {item?.isActive ? "Ngừng hoạt động" : "Bật hoạt động"}
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={saving}>
            Xoá
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 pt-3">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Tổng quan
          </TabButton>
          <TabButton active={tab === "students"} onClick={() => setTab("students")}>Học viên</TabButton>
          <TabButton active={tab === "sessions"} onClick={() => setTab("sessions")}>Buổi học</TabButton>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-gray-400">Đang tải...</p>
          ) : tab === "overview" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Thông tin lớp</h2>
                {item && (
                  <p className="text-sm text-gray-400">Tạo lúc: {new Date(item.createdAt).toLocaleString()}</p>
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
            <div className="text-sm text-gray-400">Danh sách học viên sẽ được bổ sung ở UC-03.</div>
          ) : (
            <div className="text-sm text-gray-400">Danh sách buổi học sẽ được bổ sung ở UC-04.</div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá lớp"
        description="Bạn có chắc muốn xoá lớp này? Hành động không thể hoàn tác."
        confirmText="Xoá"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-2 text-sm border-b-2 -mb-px",
        active ? "border-white text-white" : "border-transparent text-gray-400 hover:text-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
