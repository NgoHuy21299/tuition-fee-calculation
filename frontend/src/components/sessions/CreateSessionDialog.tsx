import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { SessionForm } from "./SessionForm";
import { SessionSeriesForm } from "./SessionSeriesForm";
import type { SessionDto } from "../../services/sessionService";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "series";
  classId?: string | null; // Optional for teacher's global session page
  onSuccess?: () => void;
  editingSession?: SessionDto | null;
  defaultFeePerSession?: number;
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  mode,
  classId,
  onSuccess,
  editingSession,
  defaultFeePerSession,
}: CreateSessionDialogProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSession
              ? "Chỉnh sửa buổi học"
              : mode === "single"
              ? "Tạo buổi học mới"
              : "Tạo lịch học"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {mode === "single" ? (
            <SessionForm
              open={open}
              onClose={handleClose}
              onSuccess={handleSuccess}
              classId={classId || undefined}
              editingSession={editingSession || undefined}
              defaultFeePerSession={defaultFeePerSession}
            />
          ) : (
            <SessionSeriesForm
              open={open}
              onClose={handleClose}
              onSuccess={handleSuccess}
              classId={classId || undefined}
              defaultFeePerSession={defaultFeePerSession}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}