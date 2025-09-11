import { Outlet } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";

export default function Dashboard() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
