import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { classService, type ClassDTO } from "../../services/classService";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import { useToast } from "../../components/commons/Toast";

export default function DashboardClasses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ClassDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 10);
  const q = searchParams.get("q") || "";
  const isActiveStr = searchParams.get("isActive");
  const isActive = isActiveStr === null ? undefined : isActiveStr === "true";

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function load() {
    setLoading(true);
    try {
      const { items, total } = await classService.listClasses({ page, pageSize, q, isActive, sort: 'createdAt_desc' });
      setItems(items);
      setTotal(total);
    } catch (err: unknown) {
      let message = "Tải danh sách lớp thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        message = anyErr.response?.data?.error || anyErr.message || message;
      }
      toast({ title: "Lỗi", description: message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q, isActiveStr]);

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (!next.get("page")) next.set("page", "1");
    setSearchParams(next, { replace: true });
  }

  async function onDeleteConfirmed() {
    if (!confirmDeleteId) return;
    try {
      await classService.deleteClass(confirmDeleteId);
      toast({ title: "Đã xóa", description: "Xóa lớp thành công", variant: "success" });
      setConfirmDeleteId(null);
      load();
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
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lớp học</h1>
          <p className="text-sm text-gray-400">Quản lý danh sách lớp, sĩ số, lịch học và giáo viên phụ trách.</p>
        </div>
        <Button onClick={() => navigate("/dashboard/classes/new")}>Tạo lớp</Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Tìm kiếm tên lớp..."
              value={q}
              onChange={(e) => updateParam("q", e.target.value)}
              className="w-64"
            />
            <select
              value={isActiveStr ?? ""}
              onChange={(e) => updateParam("isActive", e.target.value || null)}
              className="h-9 rounded-md border bg-white/5 border-gray-800 text-sm px-2"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2 pr-3 font-medium">Tên lớp</th>
                  <th className="py-2 pr-3 font-medium">Môn</th>
                  <th className="py-2 pr-3 font-medium">Giá mặc định</th>
                  <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  <th className="py-2 pr-3 font-medium">Tạo lúc</th>
                  <th className="py-2 pr-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Không có lớp nào
                    </td>
                  </tr>
                ) : (
                  items.map((c) => <Row key={c.id} c={c} onView={() => navigate(`/dashboard/classes/${c.id}`)} onDelete={() => setConfirmDeleteId(c.id)} />)
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              Tổng: {total} lớp. Trang {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => updateParam("page", String(Math.max(1, page - 1)))}
                disabled={page <= 1}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                onClick={() => updateParam("page", String(Math.min(totalPages, page + 1)))}
                disabled={page >= totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xóa lớp"
        description="Bạn có chắc muốn xoá lớp này? Hành động không thể hoàn tác."
        confirmText="Xoá"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}

function Row({ c, onView, onDelete }: { c: ClassDTO; onView: () => void; onDelete: () => void }) {
  return (
    <tr className="border-t border-gray-800">
      <td className="py-2 pr-3">
        <div className="font-medium">{c.name}</div>
        {c.description && <div className="text-xs text-gray-400 line-clamp-1">{c.description}</div>}
      </td>
      <td className="py-2 pr-3">{c.subject ?? "-"}</td>
      <td className="py-2 pr-3">{c.defaultFeePerSession === null ? "-" : c.defaultFeePerSession.toLocaleString()}</td>
      <td className="py-2 pr-3">
        <span className={["inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
          c.isActive ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800" : "bg-gray-800 text-gray-300 border border-gray-700",
        ].join(" ")}>{c.isActive ? "Hoạt động" : "Ngừng"}</span>
      </td>
      <td className="py-2 pr-3">{new Date(c.createdAt).toLocaleString()}</td>
      <td className="py-2 pr-0 text-right">
        <div className="inline-flex items-center gap-2">
          <Button variant="outline" onClick={onView}>Xem</Button>
          <Button variant="outline" onClick={onDelete}>Xoá</Button>
        </div>
      </td>
    </tr>
  );
}
