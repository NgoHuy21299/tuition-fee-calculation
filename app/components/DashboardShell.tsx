import React, { useState, useCallback } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import DashboardBody from "./DashboardBody";

type DashboardShellProps = {
  children?: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-black dark:bg-gray-950 dark:text-white">
      <DashboardHeader/>
      <div className="flex flex-1">
        <DashboardSidebar />
        <DashboardBody>{children}</DashboardBody>
      </div>
    </div>
  );
}
