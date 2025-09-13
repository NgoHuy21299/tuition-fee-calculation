import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { setToken } from "../utils/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import LoadingSpinner from "../components/commons/LoadingSpinner";
import { useToast } from "../components/commons/Toast";
import { Card } from "../components/ui/card";
import { authService } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register({ email, password, name });
      if (data?.token) {
        setToken(data.token);
        toast({
          title: "Đăng ký thành công",
          description: "Chào mừng bạn!",
          variant: "success",
        });
        navigate("/dashboard", { replace: true });
      } else {
        setError("Phản hồi không hợp lệ từ máy chủ");
      }
    } catch (err: unknown) {
      let message = "Đăng ký thất bại";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng ký</h1>
          <p className="text-sm text-gray-400 mt-1">Tạo tài khoản để bắt đầu</p>
        </div>

        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Họ và tên (tuỳ chọn)</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>

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
              autoComplete="new-password"
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
            {loading ? <LoadingSpinner size={18} padding={3} /> : "Đăng ký"}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-1">
          <Link
            to="/login"
            className="block text-sm text-gray-400 hover:text-gray-200 underline underline-offset-4"
          >
            Đã có tài khoản? Đăng nhập
          </Link>
          <Link
            to="/"
            className="block text-sm text-gray-400 hover:text-gray-200 underline underline-offset-4"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </Card>
    </div>
  );
}
