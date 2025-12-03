"use client";

export type PeriodType = "all-time" | "year";

interface PeriodFilterProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

export function PeriodFilter({
  value,
  onChange,
  selectedYear,
  onYearChange
}: PeriodFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodType)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="all-time">All Time</option>
        <option value="year">Specific Year</option>
      </select>

      {value === "year" && onYearChange && (
        <select
          value={selectedYear || currentYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export function getDateRangeForPeriod(
  period: PeriodType,
  selectedYear?: number
): { start: Date | null; end: Date | null } {
  if (period === "all-time") {
    return { start: null, end: null };
  }

  if (period === "year" && selectedYear) {
    return {
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31, 23, 59, 59)
    };
  }

  return { start: null, end: null };
}
