import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DateTimePickerProps {
  value?: string; // ISO string or datetime-local format
  onChange?: (value: string) => void; // datetime-local format
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function DateTimePicker({
  value = '',
  onChange,
  placeholder = 'Chọn ngày và giờ',
  disabled = false,
  error,
  label,
  required = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse the current value
  const currentDate = value ? new Date(value) : null;
  const dateStr = currentDate ? format(currentDate, 'yyyy-MM-dd') : '';
  const timeStr = currentDate ? format(currentDate, 'HH:mm') : '';

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange?.('');
      return;
    }

    // Combine date with existing time (or default to 00:00)
    const time = timeStr || '00:00';
    const combined = `${newDate}T${time}`;
    onChange?.(combined);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;

    // Combine time with existing date (or today)
    const date = dateStr || format(new Date(), 'yyyy-MM-dd');
    const combined = `${date}T${newTime}`;
    onChange?.(combined);
  };

  const displayValue = currentDate 
    ? format(currentDate, 'dd/MM/yyyy HH:mm', { locale: vi })
    : '';

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
            disabled={disabled}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {displayValue || (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-picker">Ngày</Label>
              <Input
                id="date-picker"
                type="date"
                value={dateStr}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time-picker">Giờ</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-picker"
                  type="time"
                  value={timeStr}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setOpen(false)}>
                Xong
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}