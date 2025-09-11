import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { clearToken, getToken } from "../utils/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();

  async function onLogout() {
    try {
      await client.post("/api/auth/logout");
    } catch {
      // ignore errors; server just returns 204
    } finally {
      clearToken();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <button onClick={onLogout} className="bg-black text-white rounded px-4 py-2">
            Đăng xuất
          </button>
        </div>
        <div className="bg-white rounded shadow p-4">
          <p className="text-sm text-gray-600">Token hiện tại (rút gọn): {token ? token.slice(0, 16) + "..." : "(chưa có)"}</p>
          <p className="mt-4">Hãy bắt đầu migrate các trang dashboard từ SSR sang SPA tại đây.</p>
        </div>
      </div>
    </div>
  );
}
