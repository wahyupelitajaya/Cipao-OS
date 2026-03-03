"use client";

import { useState, useCallback, useEffect } from "react";
import { useTransition } from "react";
import { Printer } from "lucide-react";
import { getMonthActivitySummary, getDayActivities } from "@/app/actions/activity";
import { getFriendlyMessage } from "@/lib/errors";
import type {
  MonthDaySummary,
  DayActivityItem,
  VisitDayState,
} from "@/app/actions/activity";
import { Button } from "@/components/ui/button";
import { ActivityCalendar } from "@/components/activity/activity-calendar";
import { ActivityDayPanel } from "@/components/activity/activity-day-panel";

interface ActivityContentProps {
  initialMonthSummary: MonthDaySummary[];
  initialSelectedDate: string;
  initialActivities: DayActivityItem[];
  initialVisit: VisitDayState | null;
  initialYear: number;
  initialMonth: number;
  cats: { id: string; name: string }[];
  admin: boolean;
}

export function ActivityContent({
  initialMonthSummary,
  initialSelectedDate,
  initialActivities,
  initialVisit,
  initialYear,
  initialMonth,
  cats,
  admin,
}: ActivityContentProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [monthSummary, setMonthSummary] = useState<MonthDaySummary[]>(initialMonthSummary);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate);
  const [activities, setActivities] = useState<DayActivityItem[]>(initialActivities);
  const [visit, setVisit] = useState<VisitDayState | null>(initialVisit);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setYear(initialYear);
    setMonth(initialMonth);
    setMonthSummary(initialMonthSummary);
    setSelectedDate(initialSelectedDate);
    setActivities(initialActivities);
    setVisit(initialVisit);
  }, [
    initialYear,
    initialMonth,
    initialMonthSummary,
    initialSelectedDate,
    initialActivities,
    initialVisit,
  ]);

  const loadMonth = useCallback((y: number, m: number) => {
    setLoadError(null);
    startTransition(async () => {
      try {
        const summary = await getMonthActivitySummary(y, m);
        setMonthSummary(summary);
      } catch (err) {
        setLoadError(getFriendlyMessage(err));
      }
    });
  }, []);

  const loadDay = useCallback((date: string) => {
    setLoadError(null);
    startTransition(async () => {
      try {
        const { activities: list, visit: v } = await getDayActivities(date);
        setActivities(list);
        setVisit(v);
      } catch (err) {
        setLoadError(getFriendlyMessage(err));
      }
    });
  }, []);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    loadDay(date);
  }

  function handlePrevMonth() {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    loadMonth(newYear, newMonth);
  }

  function handleNextMonth() {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    loadMonth(newYear, newMonth);
  }

  function formatPrintDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="no-print col-span-full flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4 shrink-0" aria-hidden />
          Cetak
        </Button>
      </div>
      <div className="no-print min-w-0">
        {loadError && (
          <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {loadError}
          </p>
        )}
        <ActivityCalendar
          year={year}
          month={month}
          days={monthSummary}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
        {isPending && (
          <p className="mt-2 text-xs text-muted-foreground">Memuat…</p>
        )}
      </div>
      <div className="no-print min-w-0">
        <ActivityDayPanel
          date={selectedDate}
          visit={visit}
          activities={activities}
          cats={cats}
          admin={admin}
          onVisitChange={
            selectedDate
              ? () => loadDay(selectedDate)
              : undefined
          }
        />
      </div>

      <div
        id="activity-print"
        className="hidden print:block activity-print"
        aria-hidden
      >
        <div className="activity-print-inner">
          <h1 className="activity-print-title">Laporan Aktivitas</h1>
          <p className="activity-print-date-label">
            Tanggal: {formatPrintDate(selectedDate)}
          </p>
          <p className="activity-print-meta">
            Dicetak pada: {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {activities.length === 0 ? (
            <p className="activity-print-empty">Belum ada aktivitas.</p>
          ) : (
            <ul className="activity-print-list">
              {activities.map((a, i) => {
                const firstTime = (a.time_slots ?? "").split(",")[0]?.trim() ?? "";
                const timeClass =
                  firstTime === "Pagi"
                    ? "activity-print-item--pagi"
                    : firstTime === "Siang"
                      ? "activity-print-item--siang"
                      : firstTime === "Sore"
                        ? "activity-print-item--sore"
                        : firstTime === "Malam"
                          ? "activity-print-item--malam"
                          : "";
                return (
                  <li key={a.id} className={`activity-print-item ${timeClass}`}>
                    <span className="activity-print-item-num">{i + 1}.</span>
                    <span className="activity-print-item-meta">
                      {[a.time_slots, a.locations, a.categories].filter(Boolean).join(" · ")}
                    </span>
                    {a.note && <span className="activity-print-item-note">{a.note}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
