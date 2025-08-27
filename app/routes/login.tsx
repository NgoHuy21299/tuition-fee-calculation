import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import LoadingSpinner from "../components/LoadingSpinner";
import { safeText, sleep } from "../utils/misc";
import { useToast } from "../components/Toast";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Đăng nhập" },
    { name: "description", content: "Đăng nhập để truy cập hệ thống" },
  ];
}

export default function Login(_: Route.ComponentProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    const reason = params.get("reason");
    if (!reason) return;
    shownRef.current = true;
    if (reason === "auth") {
      toast({ title: "Yêu cầu đăng nhập", description: "Vui lòng đăng nhập để tiếp tục.", variant: "warning" });
    } else if (reason === "logout") {
      toast({ title: "Đã đăng xuất", description: "Hẹn gặp lại bạn!", variant: "success" });
    }
    // Remove the query so remounts/HMR/StrictMode won't retrigger the toast
    setParams((prev) => {
      prev.delete("reason");
      return prev;
    }, { replace: true });
  }, [params, toast, setParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const msg = await safeText(res);
        throw new Error(msg || "Đăng nhập thất bại");
      }
      toast({ title: "Đăng nhập thành công", variant: "success" });
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
          <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Nhập email và mật khẩu để tiếp tục
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
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
              autoComplete="current-password"
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
            {loading ? (
              <LoadingSpinner size={18} background="black" padding={3}  />
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            className="block text-sm text-gray-500 hover:text-black dark:hover:text-white underline underline-offset-4 cursor-pointer mb-1"
            onClick={() => navigate("/register")}
          >
            Chưa có tài khoản? Đăng ký
          </a>
          <a
            className="text-sm text-gray-500 hover:text-black dark:hover:text-white underline underline-offset-4 cursor-pointer"
            onClick={() => navigate("/")}
          >
            Quay lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
