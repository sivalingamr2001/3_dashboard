// Define the shape of the objects
interface MonthKeyMap {
  [key: string]: [string, string | null]; 
}

interface DayLabelMap {
  [key: string]: string;
}

interface FinancialMaps {
  monthKeyMap: MonthKeyMap;
  dayLabelMap: DayLabelMap;
}

export const getDynamicDateMaps = (baseDate: Date = new Date()): FinancialMaps => {
  const yesterday = new Date(baseDate);
  yesterday.setDate(baseDate.getDate() - 1);

  const currentYear = yesterday.getFullYear();
  const currentMonth = yesterday.getMonth();

  const cfyStartYear = (currentMonth >= 3) ? currentYear : currentYear - 1;
  const pfyStartYear = cfyStartYear - 1;

  const cfyShort = String(cfyStartYear).slice(-2);
  const cfyNextShort = String(cfyStartYear + 1).slice(-2);
  const pfyShort = String(pfyStartYear).slice(-2);

  // Initialize objects with their defined types instead of {}
  const monthKeyMap: MonthKeyMap = {};
  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  monthNames.forEach((month, index) => {
    const cfyYearToken = (index <= 8) ? cfyShort : cfyNextShort;
    const pfyYearToken = (index <= 8) ? pfyShort : cfyShort;

    const pfyLabel = `${month.toUpperCase()}-${pfyYearToken}`;
    const cfyLabel = `${month.toUpperCase()}-${cfyYearToken}`;

    const absoluteMonthIndex = (index <= 8) ? index + 3 : index - 9;
    const isFutureMonth = (cfyStartYear === currentYear && absoluteMonthIndex > currentMonth) || 
                          (cfyStartYear < currentYear && absoluteMonthIndex > currentMonth && index > 8);

    monthKeyMap[month] = [pfyLabel, isFutureMonth ? null : cfyLabel];
  });

  // Initialize dayLabelMap with its defined type
  const dayLabelMap: DayLabelMap = {};

  for (let i = 0; i < 11; i++) {
    const targetDate = new Date(yesterday);
    targetDate.setDate(yesterday.getDate() - i);

    const dayStr = String(targetDate.getDate()).padStart(2, '0');
    const monthStr = targetDate.toLocaleString('en-US', { month: 'short' });
    const currentDayLabel = `${dayStr} ${monthStr}`;

    const pfyDate = new Date(targetDate);
    pfyDate.setFullYear(targetDate.getFullYear() - 1);
    
    const pfyDayStr = String(pfyDate.getDate()).padStart(2, '0');
    const pfyMonthStr = pfyDate.toLocaleString('en-US', { month: 'short' });
    const previousDayLabel = `${pfyDayStr} ${pfyMonthStr}`;

    dayLabelMap[currentDayLabel] = previousDayLabel;
  }

  return { monthKeyMap, dayLabelMap };
};
