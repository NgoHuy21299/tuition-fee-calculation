import React, { useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import DashboardBody from "./DashboardBody";
import ChangePasswordModal from "./ChangePasswordModal";

type DashboardShellProps = {
  children?: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const [openChangePw, setOpenChangePw] = useState(false);
  return (
    <div className="min-h-dvh flex flex-col bg-white text-black dark:bg-gray-950 dark:text-white">
      <DashboardHeader onChangePassword={() => setOpenChangePw(true)} />
      <div className="flex flex-1">
        <DashboardSidebar />
        <DashboardBody>{children}</DashboardBody>
      </div>
      <ChangePasswordModal open={openChangePw} onOpenChange={setOpenChangePw} />
    </div>
  );
}
