import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../commons/Toast";
import LoadingSpinner from "../commons/LoadingSpinner";
import { authService } from "../../services/authService";

export type ChangePasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ oldPassword?: string; newPassword?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onOpenChange(false);
    }
    function onClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (dialogRef.current && dialogRef.current === t) {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  function validate() {
    const next: typeof errors = {};
    if (!oldPassword) next.oldPassword = "Vui lòng nhập mật khẩu cũ";
    if (!newPassword) next.newPassword = "Vui lòng nhập mật khẩu mới";
    else if (newPassword.length < 8) next.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
    if (!confirmPassword) next.confirmPassword = "Vui lòng nhập lại mật khẩu mới";
    else if (confirmPassword !== newPassword) next.confirmPassword = "Mật khẩu nhập lại không khớp";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await authService.changePassword({ oldPassword, newPassword });
      toast({ title: "Thành công", description: "Đã thay đổi mật khẩu", variant: "success" });
      onOpenChange(false);
    } catch (err: unknown) {
      let message = "Đổi mật khẩu thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        message = anyErr.response?.data?.error || anyErr.message || message;
      }
      toast({ title: "Lỗi", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" ref={dialogRef} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-md border border-gray-800 bg-gray-950 shadow-lg p-4"
      >
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Thay đổi mật khẩu</h2>
          <p className="text-sm text-gray-400">Vui lòng nhập mật khẩu cũ và mật khẩu mới.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="oldPassword">Mật khẩu cũ</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoFocus
              disabled={submitting}
            />
            {errors.oldPassword && <p className="text-sm text-red-500">{errors.oldPassword}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
            {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size={18} padding={3} />
                </span>
              ) : (
                "Đổi mật khẩu"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
