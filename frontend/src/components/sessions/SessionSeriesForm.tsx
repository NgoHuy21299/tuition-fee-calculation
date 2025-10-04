import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import LoadingSpinner from '../commons/LoadingSpinner';
import { SessionService, type CreateSessionRequest } from '../../services/sessionService';
import { getCurrentDateTimeLocal } from '../../utils/dateHelpers';

interface SessionSeriesFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId?: string;
  defaultFeePerSession?: number;
}

type FormData = {
  startTime: string; // datetime-local format
  durationMin: number;
  feePerSession: string;
  notes: string;
  daysOfWeek: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
};

const DAYS_OF_WEEK = [
  { label: 'Chủ nhật', value: 0 },
  { label: 'Thứ hai', value: 1 },
  { label: 'Thứ ba', value: 2 },
  { label: 'Thứ tư', value: 3 },
  { label: 'Thứ năm', value: 4 },
  { label: 'Thứ sáu', value: 5 },
  { label: 'Thứ bảy', value: 6 },
];

export function SessionSeriesForm({ 
  open, 
  onClose, 
  onSuccess, 
  classId,
  defaultFeePerSession 
}: SessionSeriesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      startTime: getCurrentDateTimeLocal(),
      durationMin: 60,
      feePerSession: '',
      notes: '',
      daysOfWeek: [false, false, false, false, false, false, false], // All days unchecked
    },
  });

  const watchedValues = watch();

  // Calculate preview count = number of selected weekdays
  useEffect(() => {
    const { daysOfWeek } = watchedValues;
    if (!daysOfWeek || !Array.isArray(daysOfWeek)) {
      setPreviewCount(0);
      return;
    }
    setPreviewCount(daysOfWeek.filter(Boolean).length);
  }, [watchedValues]);

  useEffect(() => {
    if (open) {
      reset({
        startTime: getCurrentDateTimeLocal(),
        durationMin: 60,
        feePerSession: defaultFeePerSession?.toString() || '',
        notes: '',
        daysOfWeek: [false, false, false, false, false, false, false],
      });
      setSubmitError(null);
    }
  }, [open, defaultFeePerSession, reset]);

  const onSubmit = async (data: FormData) => {
    // Validate at least one day is selected
    if (!data.daysOfWeek.some(Boolean)) {
      setSubmitError('Vui lòng chọn ít nhất một ngày trong tuần');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const base = new Date(data.startTime);
      const baseDow = base.getDay(); // 0=Sun..6=Sat
      const hours = base.getHours();
      const minutes = base.getMinutes();
      const selectedDays = data.daysOfWeek
        .map((selected, index) => (selected ? index : -1))
        .filter((day) => day !== -1);

      const createPayloads: CreateSessionRequest[] = selectedDays.map((day) => {
        const target = new Date(base);
        const delta = day - baseDow;
        target.setDate(base.getDate() + delta);
        target.setHours(hours, minutes, 0, 0);
        return {
          classId,
          startTime: target.toISOString(),
          durationMin: data.durationMin,
          feePerSession: data.feePerSession ? parseInt(data.feePerSession, 10) : null,
          notes: data.notes || null,
          status: 'scheduled',
          type: 'class',
        };
      });

      // Create sessions (sequentially to avoid conflict errors ordering)
      for (const payload of createPayloads) {
        await SessionService.createSession(payload);
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo lịch học';
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo lịch học (tuần)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Ngày và giờ bắt đầu *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...register('startTime', { required: 'Vui lòng chọn ngày và giờ bắt đầu' })}
            />
            {errors.startTime && (
              <p className="text-sm text-destructive">{errors.startTime.message}</p>
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

          {/* Days of Week */}
          <div className="space-y-2">
            <Label>Các ngày trong tuần *</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day, index) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={watchedValues.daysOfWeek[index]}
                    onCheckedChange={(checked) => setValue('daysOfWeek', Object.assign([], watchedValues.daysOfWeek, { [index]: !!checked }))}
                  />
                  <Label htmlFor={`day-${index}`} className="text-sm font-normal">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Per Session */}
          <div className="space-y-2">
            <Label htmlFor="feePerSession">
              Học phí mỗi buổi
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
              placeholder={defaultFeePerSession?.toString() || 'Để trống sẽ dùng giá mặc định của lớp'}
              {...register('feePerSession')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ghi chú cho tất cả các buổi học..."
              {...register('notes')}
            />
          </div>

          {/* Preview */}
          {previewCount > 0 && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p className="font-medium text-blue-900">Xem trước:</p>
              <p className="text-blue-700">
                Sẽ tạo <strong>{previewCount}</strong> buổi học trong tuần đã chọn.
              </p>
            </div>
          )}

          {/* Error Display */}
          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{submitError}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || previewCount === 0}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size={16} /> Tạo {previewCount} buổi học
                </>
              ) : (
                `Tạo ${previewCount} buổi học`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}