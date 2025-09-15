import { Card } from "../../components/ui/card";
import ClassForm, {
  type ClassFormValues,
} from "../../components/dashboard/ClassForm";
import { classService } from "../../services/classService";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../components/commons/Toast";
import { Button } from "../../components/ui/button";

export default function ClassNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(values: ClassFormValues) {
    setSubmitting(true);
    try {
      const created = await classService.createClass(values);
      toast({
        title: "Thành công",
        description: "Đã tạo lớp",
        variant: "success",
      });
      navigate(`/dashboard/classes/${created.id}`);
    } catch (err: unknown) {
      let description = "Tạo lớp thất bại";
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
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tạo lớp mới</h1>
          <p className="text-sm text-gray-400">
            Nhập thông tin lớp học. Bạn có thể chỉnh sửa sau.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard/classes")}
        >
          Quay về danh sách
        </Button>
      </div>
      <Card>
        <ClassForm
          onSubmit={onSubmit}
          submitText="Tạo lớp"
          disabled={submitting}
        />
      </Card>
    </div>
  );
}
