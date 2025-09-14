import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title = "Xác nhận",
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    function onClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (overlayRef.current && overlayRef.current === t) onCancel();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" ref={overlayRef} />
      <div className="relative z-10 w-full max-w-sm rounded-md border border-gray-800 bg-gray-950 shadow-lg p-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={loading} aria-busy={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
