/**
 * Format date from ISO string to Vietnamese format
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time from ISO string to HH:mm format
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration from minutes to readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }
  
  return `${hours} giờ ${remainingMinutes} phút`;
}

/**
 * Format datetime for form inputs (YYYY-MM-DDTHH:mm format)
 */
export function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse datetime-local input to ISO string
 */
export function parseDateTimeLocal(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString();
}

/**
 * Get current date in datetime-local format
 */
export function getCurrentDateTimeLocal(): string {
  return formatDateTimeLocal(new Date().toISOString());
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get day of week (0=Sunday, 1=Monday, etc.)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Get preset time for "Ca 1" (16:45) - preserves current date in form
 */
export function getPresetTime1(currentDateTime?: string): string {
  const date = currentDateTime ? new Date(currentDateTime) : new Date();
  date.setHours(16, 45, 0, 0);
  return formatDateTimeLocal(date.toISOString());
}

/**
 * Get preset time for "Ca 2" (18:30) - preserves current date in form
 */
export function getPresetTime2(currentDateTime?: string): string {
  const date = currentDateTime ? new Date(currentDateTime) : new Date();
  date.setHours(18, 30, 0, 0);
  return formatDateTimeLocal(date.toISOString());
}