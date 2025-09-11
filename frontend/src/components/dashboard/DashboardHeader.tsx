import { useNavigate } from "react-router-dom";
import UserDropdown from "./UserDropdown";
import { clearToken } from "../../utils/auth";
import client from "../../api/client";

type DashboardHeaderProps = {
  onChangePassword?: () => void;
};

export default function DashboardHeader({ onChangePassword }: DashboardHeaderProps) {
  const navigate = useNavigate();

  async function onLogout() {
    try {
      await client.post("/api/auth/logout");
    } finally {
      clearToken();
      navigate("/login?reason=logout", { replace: true });
    }
  }
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white/70 dark:bg-gray-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/dashboard/overview")}
          className="font-semibold cursor-pointer"
        >
          Dashboard
        </button>
      </div>
      <div className="flex items-center gap-3">
        <UserDropdown onLogout={onLogout} onChangePassword={onChangePassword} />
      </div>
    </header>
  );
}
