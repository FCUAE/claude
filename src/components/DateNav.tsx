"use client";

interface DateNavProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  hasNext: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DateNav({ currentDate, onDateChange, hasNext }: DateNavProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => onDateChange(addDays(currentDate, -1))}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        ◀ Previous Day
      </button>
      <span className="text-sm text-gray-500 min-w-[260px] text-center">
        {formatDate(currentDate)} (yesterday&apos;s data)
      </span>
      <button
        onClick={() => onDateChange(addDays(currentDate, 1))}
        disabled={!hasNext}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next Day ▶
      </button>
    </div>
  );
}
