export const getTodayInAsiaKolkata = (): string => {
  // Get current time in India timezone
  const localTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateInKolkata = new Date(localTimeStr);
  // Subtract 10 hours for business day mapping (so rollover is at 10:00 AM IST)
  const businessDate = new Date(dateInKolkata.getTime() - 10 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(businessDate);
};
