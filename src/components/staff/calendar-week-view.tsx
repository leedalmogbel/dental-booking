"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

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

interface CalendarWeekViewProps {
  weekStart: Date;
  appointments: CalendarAppointment[];
  onWeekChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onAppointmentClick: (id: string) => void;
  startHour?: number;
  endHour?: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-200 border-yellow-400 text-yellow-900",
  confirmed: "bg-blue-200 border-blue-400 text-blue-900",
  in_progress: "bg-purple-200 border-purple-400 text-purple-900",
  completed: "bg-green-200 border-green-400 text-green-900",
  cancelled: "bg-red-200 border-red-400 text-red-900",
  no_show: "bg-gray-200 border-gray-400 text-gray-900",
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

export function CalendarWeekView({
  weekStart,
  appointments,
  onWeekChange,
  onDayClick,
  onAppointmentClick,
  startHour = 8,
  endHour = 18,
}: CalendarWeekViewProps) {
  const monday = useMemo(() => getMonday(weekStart), [weekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [monday]);

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const rowHeight = 48; // px per hour

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    }
    return map;
  }, [appointments]);

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };

  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };

  const weekLabel = `${monday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="rounded-md px-3 py-1 text-sm hover:bg-accent"
        >
          Previous
        </button>
        <h3 className="text-lg font-semibold">{weekLabel}</h3>
        <button
          onClick={nextWeek}
          className="rounded-md px-3 py-1 text-sm hover:bg-accent"
        >
          Next
        </button>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto rounded-md border">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-2" />
          {weekDays.map((day, i) => {
            const todayStr = new Date().toISOString().split("T")[0];
            const isToday = formatDateStr(day) === todayStr;
            return (
              <div
                key={i}
                className={cn(
                  "cursor-pointer border-l p-2 text-center text-sm font-medium hover:bg-accent",
                  isToday && "bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div>{dayNames[i]}</div>
                <div
                  className={cn(
                    "text-xs",
                    isToday
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          <div
            className="grid grid-cols-[60px_repeat(7,1fr)]"
            style={{ height: `${hours.length * rowHeight}px` }}
          >
            {/* Time labels column */}
            <div className="relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t"
                  style={{
                    top: `${(hour - startHour) * rowHeight}px`,
                    height: `${rowHeight}px`,
                  }}
                >
                  <span className="px-2 text-xs text-muted-foreground">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const dateStr = formatDateStr(day);
              const dayAppts = appointmentsByDay[dateStr] || [];

              return (
                <div
                  key={dayIndex}
                  className="relative border-l"
                  style={{ height: `${hours.length * rowHeight}px` }}
                >
                  {/* Hour lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t"
                      style={{
                        top: `${(hour - startHour) * rowHeight}px`,
                        height: `${rowHeight}px`,
                      }}
                    />
                  ))}

                  {/* Appointment blocks */}
                  {dayAppts.map((appt) => {
                    const startMin =
                      timeToMinutes(appt.startTime) - startHour * 60;
                    const endMin =
                      timeToMinutes(appt.endTime) - startHour * 60;
                    const topPx = (startMin / 60) * rowHeight;
                    const heightPx = Math.max(
                      ((endMin - startMin) / 60) * rowHeight,
                      20
                    );

                    if (startMin < 0) return null;

                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          "absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded border px-1 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80",
                          statusColors[appt.status] || "bg-accent"
                        )}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                        }}
                        onClick={() => onAppointmentClick(appt.id)}
                      >
                        <div className="truncate font-semibold">
                          {appt.startTime}
                        </div>
                        <div className="truncate">
                          {appt.patient?.name || ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
