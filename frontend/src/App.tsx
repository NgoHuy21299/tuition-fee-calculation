import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Login from "./routes/Login";
import { getToken } from "./utils/auth";
import Register from "./routes/Register";
import Dashboard from "./routes/Dashboard";
import { ToastProvider } from "./components/commons/Toast";
import DashboardOverview from "./routes/dashboard/Overview";
import DashboardClasses from "./routes/dashboard/class/Classes";
import DashboardTuition from "./routes/dashboard/Tuition";
import DashboardSettings from "./routes/dashboard/Settings";
import ClassNew from "./routes/dashboard/class/ClassNew";
import ClassDetail from "./routes/dashboard/class/ClassDetail";
import Students from "./routes/dashboard/student/Students";
import StudentNew from "./routes/dashboard/student/StudentNew";
import StudentEdit from "./routes/dashboard/student/StudentEdit";
import ClassRemark from "./routes/dashboard/ClassRemark";
import AttendancePage from "./routes/dashboard/attendance/AttendancePage";
import SessionsPage from "./routes/dashboard/Sessions";
import Reports from "./routes/dashboard/Reports";

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
            {/* class */}
            <Route path="classes" element={<DashboardClasses />} />
            <Route path="classes/new" element={<ClassNew />} />
            <Route path="classes/:id" element={<ClassDetail />} />
            {/* student */}
            <Route path="students" element={<Students />} />
            <Route path="students/new" element={<StudentNew />} />
            <Route path="students/:id/edit" element={<StudentEdit />} />
            <Route path="class-remark" element={<ClassRemark />} />
            {/* sessions management */}
            <Route path="sessions" element={<SessionsPage />} />
            {/* attendance */}
            <Route path="attendance/:sessionId" element={<AttendancePage />} />
            <Route path="tuition" element={<DashboardTuition />} />
            {/* reports */}
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
