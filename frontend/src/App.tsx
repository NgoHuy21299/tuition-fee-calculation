import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Login from "./routes/Login";
import { getToken } from "./utils/auth";
import Register from "./routes/Register";
import Dashboard from "./routes/Dashboard";
import { ToastProvider } from "./components/commons/Toast";
import DashboardOverview from "./routes/dashboard/Overview";
import DashboardClasses from "./routes/dashboard/Classes";
import DashboardTuition from "./routes/dashboard/Tuition";
import DashboardSettings from "./routes/dashboard/Settings";
import ClassNew from "./routes/dashboard/ClassNew";
import ClassDetail from "./routes/dashboard/ClassDetail";
import Students from "./routes/dashboard/Students";
import StudentNew from "./routes/dashboard/StudentNew";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login?reason=auth" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="classes" element={<DashboardClasses />} />
            <Route path="classes/new" element={<ClassNew />} />
            <Route path="classes/:id" element={<ClassDetail />} />
            <Route path="students" element={<Students />} />
            <Route path="students/new" element={<StudentNew />} />
            <Route path="tuition" element={<DashboardTuition />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
