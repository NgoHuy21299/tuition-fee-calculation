import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { 
  SessionService,
  type CreateSessionSeriesRequest,
} from '../../services/sessionService';
import { getCurrentDateTimeLocal, addDays, getDayOfWeek } from '../../utils/dateHelpers';

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
  endDate: string; // date format
  maxOccurrences: string;
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
      endDate: '',
      maxOccurrences: '10',
      daysOfWeek: [false, false, false, false, false, false, false], // All days unchecked
    },
  });

  const watchedValues = watch();

  // Calculate preview count
  useEffect(() => {
    const { startTime, endDate, maxOccurrences, daysOfWeek } = watchedValues;
    
    if (!startTime || !endDate || !daysOfWeek.some(Boolean)) {
      setPreviewCount(0);
      return;
    }

    try {
      const startDate = new Date(startTime);
      const endDateObj = new Date(endDate + 'T23:59:59');
      const maxOcc = parseInt(maxOccurrences, 10) || 0;
      
      if (endDateObj <= startDate || maxOcc <= 0) {
        setPreviewCount(0);
        return;
      }

      // Calculate how many sessions would be generated
      const selectedDays = daysOfWeek
        .map((selected, index) => selected ? index : -1)
        .filter(day => day !== -1);

      let count = 0;
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDateObj && count < maxOcc) {
        if (selectedDays.includes(getDayOfWeek(currentDate))) {
          count++;
        }
        currentDate = addDays(currentDate, 1);
      }

      setPreviewCount(count);
    } catch {
      setPreviewCount(0);
    }
  }, [watchedValues]);

  useEffect(() => {
    if (open) {
      const nextWeek = addDays(new Date(), 30); // Default to 30 days from now
      
      reset({
        startTime: getCurrentDateTimeLocal(),
        durationMin: 60,
        feePerSession: defaultFeePerSession?.toString() || '',
        notes: '',
        endDate: nextWeek.toISOString().split('T')[0], // YYYY-MM-DD format
        maxOccurrences: '10',
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
      const selectedDays = data.daysOfWeek
        .map((selected, index) => selected ? index : -1)
        .filter(day => day !== -1);

      const payload: CreateSessionSeriesRequest = {
        classId,
        startTime: new Date(data.startTime).toISOString(),
        durationMin: data.durationMin,
        feePerSession: data.feePerSession ? parseInt(data.feePerSession, 10) : null,
        notes: data.notes || null,
        type: 'class',
        recurrence: {
          daysOfWeek: selectedDays,
          endDate: data.endDate,
          maxOccurrences: parseInt(data.maxOccurrences, 10) || undefined,
        },
      };

      await SessionService.createSessionSeries(payload);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Có lỗi xảy ra khi tạo lịch học';
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

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    const newDaysOfWeek = [...watchedValues.daysOfWeek];
    newDaysOfWeek[dayIndex] = checked;
    setValue('daysOfWeek', newDaysOfWeek);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo lịch học định kỳ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Ngày và giờ bắt đầu *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...register('startTime', { 
                required: 'Vui lòng chọn ngày và giờ bắt đầu' 
              })}
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
                    onCheckedChange={(checked) => handleDayToggle(index, !!checked)}
                  />
                  <Label htmlFor={`day-${index}`} className="text-sm font-normal">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">Kết thúc trước ngày *</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate', { 
                  required: 'Vui lòng chọn ngày kết thúc' 
                })}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>

            {/* Max Occurrences */}
            <div className="space-y-2">
              <Label htmlFor="maxOccurrences">Tối đa số buổi *</Label>
              <Input
                id="maxOccurrences"
                type="number"
                min="1"
                max="100"
                {...register('maxOccurrences', {
                  required: 'Vui lòng nhập số buổi tối đa',
                })}
              />
              {errors.maxOccurrences && (
                <p className="text-sm text-destructive">{errors.maxOccurrences.message}</p>
              )}
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
              placeholder={defaultFeePerSession?.toString() || "Để trống sẽ dùng giá mặc định của lớp"}
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
                Sẽ tạo <strong>{previewCount}</strong> buổi học dựa trên cài đặt trên.
              </p>
              {previewCount > 50 && (
                <p className="text-yellow-700 mt-1">
                  ⚠️ Tạo nhiều buổi học có thể mất thời gian. Hãy xem xét giảm số lượng.
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={isSubmitting || previewCount === 0}>
              {isSubmitting ? 'Đang tạo...' : `Tạo ${previewCount} buổi học`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}