import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { classService, type ClassDTO } from "../../services/classService";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import { useToast } from "../../components/commons/Toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Checkbox } from "../../components/ui/checkbox";
import LoadingSpinner from "../../components/commons/LoadingSpinner";

export default function DashboardClasses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ClassDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [viewAll, setViewAll] = useState(false);

  // Derived filtered items (client-side)
  const filtered = useMemo(() => {
    let list = items.slice();
    // Client-side filter by status
    if (statusFilter === "active") list = list.filter((x) => x.isActive);
    if (statusFilter === "inactive") list = list.filter((x) => !x.isActive);
    // Client-side search across name + subject + defaultFeePerSession
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((x) => {
        const mix = [
          x.name ?? "",
          x.subject ?? "",
          x.defaultFeePerSession == null ? "" : String(x.defaultFeePerSession),
        ]
          .join(" ")
          .toLowerCase();
        return mix.includes(term);
      });
    }
    // Sort: active first, then by name asc
    list.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [items, q, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const { items, total } = await classService.listClasses({
        isGetAll: viewAll,
      });
      setItems(items);
      setTotal(total);
    } catch (err: unknown) {
      let message = "Tải danh sách lớp thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
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
  }, [viewAll]);

  function formatLocal(dt: string) {
    const d = new Date(dt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  async function onDeleteConfirmed() {
    if (!confirmDeleteId) return;
    try {
      await classService.deleteClass(confirmDeleteId);
      toast({
        title: "Đã xóa",
        description: "Xóa lớp thành công",
        variant: "success",
      });
      setConfirmDeleteId(null);
      load();
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
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lớp học</h1>
          <p className="text-sm text-gray-400">
            Quản lý danh sách lớp, sĩ số, lịch học và giáo viên phụ trách.
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/classes/new")}>
          Tạo lớp
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Tìm kiếm... (Tên lớp, Môn, Giá)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {statusFilter === "all"
                    ? "Tất cả trạng thái"
                    : statusFilter === "active"
                    ? "Đang hoạt động"
                    : "Ngừng hoạt động"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Tất cả trạng thái
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                  Đang hoạt động
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                  Ngừng hoạt động
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div
              className="inline-flex items-center gap-2 text-sm text-gray-300 select-none"
              title="Khi chọn sẽ xem tất cả các lớp bao gồm cả các lớp cũ đã tạo từ lâu hoặc đã ngừng hoạt động"
            >
              <Checkbox
                id="view-all"
                checked={viewAll}
                onCheckedChange={(v) => setViewAll(!!v)}
              />
              <label htmlFor="view-all">Xem tất cả các lớp</label>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center overflow-hidden">
                <LoadingSpinner size={32} padding={6} />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2 pr-3 font-medium">Tên lớp</th>
                    <th className="py-2 pr-3 font-medium">Môn</th>
                    <th className="py-2 pr-3 font-medium">Giá mặc định</th>
                    <th className="py-2 pr-3 font-medium">Trạng thái</th>
                    <th className="py-2 pr-3 font-medium">Tạo lúc</th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-gray-400"
                      >
                        Không có lớp nào
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <Row
                        key={c.id}
                        c={c}
                        onView={() => navigate(`/dashboard/classes/${c.id}`)}
                        onDelete={() => setConfirmDeleteId(c.id)}
                        formatLocal={formatLocal}
                      />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              Tổng: {filtered.length} lớp. (Đã tải {total} từ server)
            </p>
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

function Row({
  c,
  onView,
  onDelete,
  formatLocal,
}: {
  c: ClassDTO;
  onView: () => void;
  onDelete: () => void;
  formatLocal: (s: string) => string;
}) {
  return (
    <tr className="border-t border-gray-800">
      <td className="py-2 pr-3">
        <div className="font-medium">{c.name}</div>
        {c.description && (
          <div className="text-xs text-gray-400 line-clamp-1">
            {c.description}
          </div>
        )}
      </td>
      <td className="py-2 pr-3">{c.subject ?? "-"}</td>
      <td className="py-2 pr-3">
        {c.defaultFeePerSession === null
          ? "-"
          : c.defaultFeePerSession.toLocaleString("vi-VN")}
      </td>
      <td className="py-2 pr-3">
        <span
          className={[
            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
            c.isActive
              ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
              : "bg-red-900/30 text-red-300 border border-red-800",
          ].join(" ")}
        >
          {c.isActive ? "Hoạt động" : "Ngừng hoạt động"}
        </span>
      </td>
      <td className="py-2 pr-3">{formatLocal(c.createdAt)}</td>
      <td className="py-2 pr-0 text-right">
        <div className="inline-flex items-center gap-2">
          <Button variant="outline" onClick={onView}>
            Xem
          </Button>
          <Button variant="outline" onClick={onDelete}>
            Xoá
          </Button>
        </div>
      </td>
    </tr>
  );
}
