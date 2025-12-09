import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";

export type DateRange =
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year"
  | "all-time";

export interface DateBoundaries {
  start: Date;
  end: Date;
}

/**
 * Get date boundaries for a given date range
 * Returns null for 'all-time' (no filtering needed)
 */
export function getDateBoundaries(range: DateRange): DateBoundaries | null {
  const now = new Date();

  switch (range) {
    case "this-month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };

    case "last-month":
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };

    case "this-year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };

    case "last-year":
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
      };

    case "all-time":
      return null; // No filtering needed
  }
}

/**
 * Filter items by date range
 * @param items Array of items with a date field
 * @param dateRange Selected date range
 * @param dateField Name of the date field (default: 'entry_date')
 */
export function filterByDateRange<T extends Record<string, any>>(
  items: T[],
  dateRange: DateRange,
  dateField: keyof T = "entry_date" as keyof T
): T[] {
  const boundaries = getDateBoundaries(dateRange);

  if (!boundaries) {
    return items; // Return all for 'all-time'
  }

  return items.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;

    try {
      const itemDate =
        typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
      return isWithinInterval(itemDate, {
        start: boundaries.start,
        end: boundaries.end,
      });
    } catch (error) {
      console.warn(`Invalid date value: ${dateValue}`);
      return false;
    }
  });
}

/**
 * Format date range label for display
 */
export function getDateRangeLabel(range: DateRange): string {
  const boundaries = getDateBoundaries(range);

  if (!boundaries) {
    return "All Time";
  }

  const startStr = format(boundaries.start, "dd MMM yyyy");
  const endStr = format(boundaries.end, "dd MMM yyyy");

  return `${startStr} - ${endStr}`;
}

/**
 * Filter items by custom date range
 * @param items Array of items with a date field
 * @param startDate Custom start date
 * @param endDate Custom end date
 * @param dateField Name of the date field (default: 'entry_date')
 */
export function filterByCustomDateRange<T extends Record<string, any>>(
  items: T[],
  startDate: Date,
  endDate: Date,
  dateField: keyof T = "entry_date" as keyof T
): T[] {
  return items.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return false;

    try {
      const itemDate =
        typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
      return isWithinInterval(itemDate, {
        start: startDate,
        end: endDate,
      });
    } catch (error) {
      console.warn(`Invalid date value: ${dateValue}`);
      return false;
    }
  });
}

/**
 * Format custom date range label for display
 */
export function formatCustomDateLabel(startDate: Date, endDate: Date): string {
  const startStr = format(startDate, "dd MMM yyyy");
  const endStr = format(endDate, "dd MMM yyyy");
  return `${startStr} - ${endStr}`;
}
