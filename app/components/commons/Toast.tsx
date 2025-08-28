import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number; // ms
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const NoopToastContext: ToastContextValue = {
  toast: (t) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("useToast called without provider. This is safe in dev/HMR but you should wrap your app with <ToastProvider/>.", t);
    }
  },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? NoopToastContext;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>((t) => {
    const id = Math.random().toString(36).slice(2);
    const item: Toast = {
      id,
      duration: 3000,
      variant: "default",
      ...t,
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    // Enter transition
    const id = window.requestAnimationFrame(() => setVisible(true));
    // Auto dismiss
    const duration = t.duration ?? 3000;
    closeTimer.current = window.setTimeout(() => startClose(), duration);
    return () => {
      window.cancelAnimationFrame(id);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startClose() {
    setVisible(false);
    // Wait for exit transition
    window.setTimeout(() => onDismiss(), 200);
  }

  return (
    <div
      role="status"
      className={[
        "min-w-[260px] max-w-[380px] rounded-md border px-4 py-3 shadow-lg backdrop-blur",
        "bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800",
        // Animation
        "transition-all duration-200",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 h-2.5 w-2.5 rounded-full",
            t.variant === "success"
              ? "bg-emerald-500"
              : t.variant === "error"
              ? "bg-red-500"
              : t.variant === "warning"
              ? "bg-amber-500"
              : "bg-gray-400",
          ].join(" ")}
        />
        <div className="flex-1">
          {t.title && <div className="text-sm font-medium leading-none">{t.title}</div>}
          {t.description && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t.description}</div>
          )}
        </div>
        <button
          aria-label="Close"
          className="text-xs text-gray-500 hover:text-black dark:hover:text-white"
          onClick={startClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}
