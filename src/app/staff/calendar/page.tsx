"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDayView } from "@/components/staff/calendar-day-view";
import { CalendarWeekView } from "@/components/staff/calendar-week-view";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; durationMinutes: number; price: string } | null;
  dentist: { name: string; specialization: string | null } | null;
  patient: { name: string; email: string; phone: string | null } | null;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const router = useRouter();
  const [tab, setTab] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let dateFrom: string;
      let dateTo: string;

      if (tab === "day") {
        dateFrom = formatDateStr(currentDate);
        dateTo = dateFrom;
      } else {
        const monday = getMonday(weekStart);
        dateFrom = formatDateStr(monday);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        dateTo = formatDateStr(sunday);
      }

      const res = await fetch(
        `/api/staff/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      if (res.ok) {
        setAppointments(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, currentDate, weekStart]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setTab("day");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          View appointments in a calendar format.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="day">Day View</TabsTrigger>
          <TabsTrigger value="week">Week View</TabsTrigger>
        </TabsList>

        <TabsContent value="day">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <CalendarDayView
              date={currentDate}
              appointments={appointments}
              onDateChange={setCurrentDate}
              onAppointmentClick={(id) =>
                router.push(`/staff/appointments/${id}`)
              }
            />
          )}
        </TabsContent>

        <TabsContent value="week">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : (
            <CalendarWeekView
              weekStart={weekStart}
              appointments={appointments}
              onWeekChange={setWeekStart}
              onDayClick={handleDayClick}
              onAppointmentClick={(id) =>
                router.push(`/staff/appointments/${id}`)
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
