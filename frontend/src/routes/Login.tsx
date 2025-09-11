import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";
import { setToken } from "../utils/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/api/auth/login", { email, password });
      if (data?.token) {
        setToken(data.token);
        navigate("/dashboard", { replace: true });
      } else {
        setError("Phản hồi không hợp lệ từ máy chủ");
      }
    } catch (err: unknown) {
      let message = "Đăng nhập thất bại";
      if (typeof err === "object" && err !== null) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        message = anyErr.response?.data?.error || anyErr.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Đăng nhập</h1>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block" htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-1 block" htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full cursor-pointer" disabled={loading} aria-busy={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>
        <p className="text-sm mt-4">
          Chưa có tài khoản? <Link to="/register" className="text-blue-600">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
