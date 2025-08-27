import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/register";
import LoadingSpinner from "../components/LoadingSpinner";
import { safeText } from "../utils/misc";
import { useToast } from "../components/Toast";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Đăng ký" }, { name: "description", content: "Tạo tài khoản mới" }];
}

export default function Register(_: Route.ComponentProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });
      if (!res.ok) {
        const msg = await safeText(res);
        throw new Error(msg || "Đăng ký thất bại");
      }
      toast({ title: "Đăng ký thành công", description: "Chào mừng bạn!", variant: "success" });
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white text-black dark:bg-gray-950 dark:text-white px-4">
      <div className="w-full max-w-sm border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Đăng ký</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tạo tài khoản để bắt đầu</p>
        </div>

        {error && <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Họ và tên (tuỳ chọn)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 outline-none focus:ring-2 focus:ring-black/80 dark:focus:ring-white/60"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 outline-none focus:ring-2 focus:ring-black/80 dark:focus:ring-white/60"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 outline-none focus:ring-2 focus:ring-black/80 dark:focus:ring-white/60"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-10 rounded-md bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <LoadingSpinner size={18} background="black" padding={3} /> : "Đăng ký"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-1">
          <a
            className="block text-sm text-gray-500 hover:text-black dark:hover:text-white underline underline-offset-4 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Đã có tài khoản? Đăng nhập
          </a>
          <a
            className="block text-sm text-gray-500 hover:text-black dark:hover:text-white underline underline-offset-4 cursor-pointer"
            onClick={() => navigate("/")}
          >
            Quay lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
