import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserDropdownProps = {
  onLogout?: () => void;
  onChangePassword?: () => void;
  className?: string;
};

export default function UserDropdown({ onLogout, onChangePassword, className }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleChangePassword() {
    setOpen(false);
    onChangePassword?.();
  }

  function handleLogout() {
    setOpen(false);
    onLogout?.();
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={btnRef as any}
        type="button"
        variant="outline"
        size="icon"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full cursor-pointer"
        title="Tài khoản"
      >
        <UserIcon />
      </Button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg overflow-hidden z-50"
        >
          <button
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 text-left"
            onClick={handleChangePassword}
          >
            <KeyIcon />
            Thay đổi mật khẩu
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-800" />
          <button
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 text-left text-red-600 dark:text-red-400"
            onClick={handleLogout}
          >
            <LogoutIcon />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M21 2l-2 2m-7.5 7.5L7 16l-4 1 1-4 4.5-4.5" />
      <circle cx="17" cy="7" r="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
