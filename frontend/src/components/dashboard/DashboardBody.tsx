import type { ReactNode } from "react";

type DashboardBodyProps = {
  children?: ReactNode;
};

export default function DashboardBody({ children }: DashboardBodyProps) {
  return (
    <main className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 lg:p-8">
        {children ?? (
          <div className="text-sm text-gray-400">
            Nội dung dashboard sẽ hiển thị ở đây.
          </div>
        )}
      </div>
    </main>
  );
}
