/**
 * Safe date formatter — returns "-" for null, undefined, or invalid dates
 * instead of throwing RangeError: Invalid time value
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/** Date-only variant (no time) for cashout records */
export const formatDateOnly = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

/** Reusable business date helper using India timezone with a 10-hour offset for next morning cashouts */
export const getTodayInAsiaKolkata = (): string => {
  const localTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateInKolkata = new Date(localTimeStr);
  const businessDate = new Date(dateInKolkata.getTime() - 10 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(businessDate);
};
