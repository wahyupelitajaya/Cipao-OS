"use client";

import { cn } from "@/lib/utils";
import type { MonthDaySummary } from "@/app/actions/activity";

interface ActivityCalendarProps {
  year: number;
  month: number;
  days: MonthDaySummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ActivityCalendar({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: ActivityCalendarProps) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const padding = firstDay; // 0 = Sunday

  return (
    <div className="rounded-lg border border-border bg-background-elevated p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Bulan sebelumnya"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Bulan berikutnya"
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {Array.from({ length: padding }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(({ date, status }) => {
          const dayNum = date.slice(-2);
          const isSelected = selectedDate === date;
          const hasActivity = status === "visited" || status === "partial";
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded py-1.5 transition-colors",
                "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                hasActivity && "bg-[hsl(var(--status-bg-ok))]",
                isSelected && "bg-muted font-medium text-foreground ring-1 ring-border",
              )}
            >
              <span className={cn("text-foreground", isSelected && "font-semibold")}>
                {parseInt(dayNum, 10)}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  hasActivity && "bg-[hsl(var(--status-ok))]",
                  status === "none" && "bg-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
