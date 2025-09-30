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
import { studentService, type StudentDTO } from '../../services/studentService';
import { PrivateSessionService, type CreatePrivateSessionRequest } from '../../services/privateSessionService';
import MultipleSelector, { type Option } from '../ui/multiple-selector';
import { parseDateTimeLocal, getCurrentDateTimeLocal, getPresetTime1, getPresetTime2 } from '../../utils/dateHelpers';
import { DateTimePicker } from '../ui/datetime-picker';

interface PrivateSessionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultFeePerSession?: number;
}

type FormData = {
  startTime: string; // datetime-local format
  durationMin: number;
  feePerSession: string; // string for form input
  notes: string;
};

export function PrivateSessionForm({ 
  open, 
  onClose, 
  onSuccess, 
  defaultFeePerSession 
}: PrivateSessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Option[]>([]);

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

  // Load students when dialog opens
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await studentService.listStudents({});
        setStudents(response.items);
      } catch (error) {
        console.error('Failed to load students:', error);
      }
    };

    if (open) {
      loadStudents();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setValue('startTime', getCurrentDateTimeLocal());
      setValue('durationMin', 90); // Default to 90 minutes
      setValue('feePerSession', defaultFeePerSession?.toString() || '');
      setValue('notes', '');
      setSelectedStudents([]);
      setSubmitError(null);
    }
  }, [open, defaultFeePerSession, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create private session for selected students
      const studentIds = selectedStudents.map(option => option.value);
      
      if (studentIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một học sinh');
      }

      const payload: CreatePrivateSessionRequest = {
        studentIds,
        startTime: parseDateTimeLocal(data.startTime),
        durationMin: data.durationMin,
        feePerSession: parseInt(data.feePerSession, 10),
        notes: data.notes || null,
        type: 'ad_hoc',
        status: 'scheduled',
      };

      // Create a single private session for all selected students
      await PrivateSessionService.createPrivateSession(payload);

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

  // Convert students to options for MultipleSelector
  const studentOptions: Option[] = students.map(student => ({
    value: student.id,
    label: student.name,
  }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo buổi học riêng</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Chọn học sinh *</Label>
            <MultipleSelector
              value={selectedStudents}
              onChange={setSelectedStudents}
              defaultOptions={studentOptions}
              placeholder="Tìm và chọn học sinh..."
              emptyIndicator={
                <p className="text-center text-sm text-gray-500">
                  Không tìm thấy học sinh
                </p>
              }
            />
            {selectedStudents.length === 0 && (
              <p className="text-sm text-destructive">Vui lòng chọn ít nhất một học sinh</p>
            )}
          </div>

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
            {/* Preset buttons */}
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
              Học phí buổi học *
            </Label>
            <Input
              id="feePerSession"
              type="number"
              min="0"
              placeholder="Nhập học phí buổi học"
              {...register('feePerSession', {
                required: 'Vui lòng nhập học phí buổi học',
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
            <Button type="submit" disabled={isSubmitting || selectedStudents.length === 0}>
              {isSubmitting ? 'Đang lưu...' : 'Tạo buổi học'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
