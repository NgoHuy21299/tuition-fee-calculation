import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { setToken } from "../utils/auth";
import { EmailValidator } from "../utils/emailValidation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import LoadingSpinner from "../components/commons/LoadingSpinner";
import { useEffect, useRef } from "react";
import { useToast } from "../components/commons/Toast";
import { Card } from "../components/ui/card";
import { authService } from "../services/authService";
import EmailValidationError from "../components/commons/EmailValidationError";

export default function Login() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const shownRef = useRef(false);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shownRef.current) return;
    const reason = params.get("reason");
    if (!reason) return;
    shownRef.current = true;
    if (reason === "auth") {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để tiếp tục.",
        variant: "warning",
      });
    } else if (reason === "logout") {
      toast({
        title: "Đã đăng xuất",
        description: "Hẹn gặp lại bạn!",
        variant: "success",
      });
    }
    setParams(
      (prev) => {
        prev.delete("reason");
        return prev;
      },
      { replace: true }
    );
  }, [params, setParams, toast]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await EmailValidator.validateEmailOrThrow(email);

      const data = await authService.login({ email, password });
      if (data?.token) {
        setToken(data.token);
        toast({ title: "Đăng nhập thành công", variant: "success" });
        navigate("/dashboard", { replace: true });
      } else {
        setError("Phản hồi không hợp lệ từ máy chủ");
      }
    } catch (err: unknown) {
      let message = "Đăng nhập thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        message = anyErr.response?.data?.error || anyErr.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-950 text-white px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-gray-400 mt-1">
            Nhập email và mật khẩu để tiếp tục
          </p>
        </div>

        <EmailValidationError error={error} email={email} />

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-10 cursor-pointer"
          >
            {loading ? <LoadingSpinner size={18} padding={3} /> : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/register"
            className="block text-sm text-gray-400 hover:text-gray-200 underline underline-offset-4"
          >
            Chưa có tài khoản? Đăng ký
          </Link>
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-gray-200 underline underline-offset-4"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </Card>
    </div>
  );
}
