import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { studentService, type StudentDTO } from "../../services/studentService";
import { classService, type ClassDTO } from "../../services/classService";
import ConfirmDialog from "../../components/commons/ConfirmDialog";
import { useToast } from "../../components/commons/Toast";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import LoadingSpinner from "../../components/commons/LoadingSpinner";

export default function Students() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StudentDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState<ClassDTO[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Page now uses dedicated creation page instead of inline modal
  const [q, setQ] = useState("");

  const classId = searchParams.get("classId") || "";

  const selectedClassName = useMemo(() => {
    if (!classId) return "Tất cả lớp";
    const found = classes.find((c) => c.id === classId);
    return found?.name ?? "Tất cả lớp";
  }, [classId, classes]);

  useEffect(() => {
    (async () => {
      try {
        const { items, total } = await studentService.listStudents({
          classId: classId || undefined,
        });
        setItems(items);
        setTotal(total);
      } catch {
        toast({
          variant: "error",
          title: "Lỗi",
          description: "Tải danh sách học sinh thất bại",
        });
      }
    })();
  }, [classId, toast]);

  useEffect(() => {
    (async () => {
      try {
        const { items } = await classService.listClasses({ isGetAll: true });
        setClasses(items);
      } catch {
        // non-blocking
      }
    })();
  }, []);

  const setClassFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete("classId");
    else next.set("classId", value);
    setSearchParams(next);
  };

  const openCreate = () => {
    const classOptions = classes
      .filter((c) => c.isActive)
      .map((c) => ({ label: c.name, value: c.id }));
    navigate("/dashboard/students/new", { state: { classOptions } });
  };
  const openEdit = (id: string) => {
    const classOptions = classes
      .filter((c) => c.isActive)
      .map((c) => ({ label: c.name, value: c.id }));
    navigate(`/dashboard/students/${encodeURIComponent(id)}/edit`, {
      state: { classOptions },
    });
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const { items, total } = await studentService.listStudents({
        classId: classId || undefined,
      });
      setItems(items);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await studentService.deleteStudent(id);
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã xoá học sinh",
      });
      await refresh();
    } catch {
      toast({
        variant: "error",
        title: "Lỗi",
        description: "Xoá học sinh thất bại",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Học sinh</h1>
          <p className="text-sm text-gray-400">
            Quản lý danh sách học sinh và thông tin liên lạc.
          </p>
        </div>
        <Button variant="success" onClick={openCreate}>Tạo học sinh</Button>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Tìm kiếm... (Tên, SĐT)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{selectedClassName}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setClassFilter("")}>
                  Tất cả lớp
                </DropdownMenuItem>
                {classes.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setClassFilter(c.id)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
                    <th className="py-2 pr-3 font-medium">Tên</th>
                    <th className="py-2 pr-3 font-medium">Lớp đang theo học</th>
                    <th className="py-2 pr-3 font-medium">Điện thoại</th>
                    <th className="py-2 pr-3 font-medium text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((s) => {
                      const term = q.trim().toLowerCase();
                      if (!term) return true;
                      const mix = [s.name ?? "", s.phone ?? ""]
                        .join(" ")
                        .toLowerCase();
                      return mix.includes(term);
                    })
                    .map((s) => (
                      <tr key={s.id} className="border-t border-gray-800">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{s.name}</div>
                        </td>
                        <td className="py-2 pr-3 text-gray-300">
                          {s.currentClasses || "-"}
                        </td>
                        <td className="py-2 pr-3">{s.phone || "-"}</td>
                        <td className="py-2 pr-0 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => openEdit(s.id)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setConfirmDeleteId(s.id)}
                            >
                              Xoá
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              Tổng: {items.length} học sinh. (Đã tải {total} từ server)
            </p>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xác nhận xoá học sinh"
        description="Bạn có chắc muốn xoá học sinh này? Hành động không thể hoàn tác."
        confirmText="Xoá"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await onDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />
    </div>
  );
}
