import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { 
  SessionService,
  type CreateSessionRequest, 
  type UpdateSessionRequest,
  type SessionDto,
} from '../../services/sessionService';
import { formatDateTimeLocal, parseDateTimeLocal, getCurrentDateTimeLocal, getPresetTime1, getPresetTime2 } from '../../utils/dateHelpers';
import { DateTimePicker } from '../ui/datetime-picker';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId?: string;
  editingSession?: SessionDto;
  defaultFeePerSession?: number;
}

type FormData = {
  startTime: string; // datetime-local format
  durationMin: number;
  feePerSession: string; // string for form input
  notes: string;
};

export function SessionForm({ 
  open, 
  onClose, 
  onSuccess, 
  classId, 
  editingSession,
  defaultFeePerSession 
}: SessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      startTime: getCurrentDateTimeLocal(),
      durationMin: 90, // Default to 90 minutes
      feePerSession: '',
      notes: '',
    },
  });

  // Reset form when dialog opens/closes or editing session changes
  useEffect(() => {
    if (open) {
      if (editingSession) {
        // Editing mode
        setValue('startTime', formatDateTimeLocal(editingSession.startTime));
        setValue('durationMin', editingSession.durationMin);
        setValue('feePerSession', editingSession.feePerSession?.toString() || '');
        setValue('notes', editingSession.notes || '');
      } else {
        // Create mode
        setValue('startTime', getCurrentDateTimeLocal());
        setValue('durationMin', 90); // Default to 90 minutes
        setValue('feePerSession', defaultFeePerSession?.toString() || '');
        setValue('notes', '');
      }
      setSubmitError(null);
    }
  }, [open, editingSession, defaultFeePerSession, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        startTime: parseDateTimeLocal(data.startTime),
        durationMin: data.durationMin,
        feePerSession: data.feePerSession ? parseInt(data.feePerSession, 10) : null,
        notes: data.notes || null,
      };

      if (editingSession) {
        // Update existing session
        const updatePayload: UpdateSessionRequest = payload;
        await SessionService.updateSession(editingSession.id, updatePayload);
      } else {
        // Create new session
        const createPayload: CreateSessionRequest = {
          ...payload,
          classId,
          type: 'class',
          status: 'scheduled',
        };
        await SessionService.createSession(createPayload);
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Có lỗi xảy ra khi lưu buổi học';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  const handlePresetTime = (presetType: 'ca1' | 'ca2') => {
    if (presetType === 'ca1') {
      setValue('startTime', getPresetTime1());
      setValue('durationMin', 90);
    } else {
      setValue('startTime', getPresetTime2());
      setValue('durationMin', 90);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingSession ? 'Chỉnh sửa buổi học' : 'Tạo buổi học mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Start Time */}
          <div className="space-y-2">
            <DateTimePicker
              label="Ngày và giờ bắt đầu"
              required
              value={watch('startTime')}
              onChange={(val) => setValue('startTime', val)}
              error={errors.startTime?.message}
              disabled={isSubmitting}
            />
            {/* Preset buttons - only show in create mode */}
            {!editingSession && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('ca1')}
                  className="text-xs"
                >
                  🕐 Ca 1 (16:45 - 90p)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetTime('ca2')}
                  className="text-xs"
                >
                  🕕 Ca 2 (18:30 - 90p)
                </Button>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationMin">Thời lượng (phút) *</Label>
            <Input
              id="durationMin"
              type="number"
              min="1"
              {...register('durationMin', {
                required: 'Vui lòng nhập thời lượng',
                valueAsNumber: true,
                min: { value: 1, message: 'Thời lượng phải lớn hơn 0' },
              })}
            />
            {errors.durationMin && (
              <p className="text-sm text-destructive">{errors.durationMin.message}</p>
            )}
          </div>

          {/* Fee Per Session */}
          <div className="space-y-2">
            <Label htmlFor="feePerSession">
              Học phí buổi học 
              {defaultFeePerSession && (
                <span className="text-sm text-muted-foreground ml-1">
                  (Mặc định: {new Intl.NumberFormat('vi-VN').format(defaultFeePerSession)} VNĐ)
                </span>
              )}
            </Label>
            <Input
              id="feePerSession"
              type="number"
              min="0"
              placeholder={defaultFeePerSession?.toString() || "Để trống sẽ dùng giá mặc định của lớp"}
              {...register('feePerSession', {
                valueAsNumber: false, // Keep as string to handle empty values
              })}
            />
            {errors.feePerSession && (
              <p className="text-sm text-destructive">{errors.feePerSession.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Thêm ghi chú cho buổi học..."
              {...register('notes')}
            />
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {submitError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : (editingSession ? 'Cập nhật' : 'Tạo buổi học')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}