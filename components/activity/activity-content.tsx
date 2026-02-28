"use client";

import { useState, useCallback, useEffect } from "react";
import { useTransition } from "react";
import { getMonthActivitySummary, getDayActivities } from "@/app/actions/activity";
import { getFriendlyMessage } from "@/lib/errors";
import type {
  MonthDaySummary,
  DayActivityItem,
  VisitDayState,
} from "@/app/actions/activity";
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="min-w-0">
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
      <div className="min-w-0">
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
    </div>
  );
}
