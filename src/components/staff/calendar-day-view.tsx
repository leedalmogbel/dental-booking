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

interface CalendarDayViewProps {
  date: Date;
  appointments: CalendarAppointment[];
  onDateChange: (date: Date) => void;
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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function CalendarDayView({
  date,
  appointments,
  onDateChange,
  onAppointmentClick,
  startHour = 8,
  endHour = 18,
}: CalendarDayViewProps) {
  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const totalMinutes = (endHour - startHour) * 60;
  const rowHeight = 64; // px per hour

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  };

  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevDay}
          className="rounded-md px-3 py-1 text-sm hover:bg-accent"
        >
          Previous
        </button>
        <h3 className="text-lg font-semibold">{dateStr}</h3>
        <button
          onClick={nextDay}
          className="rounded-md px-3 py-1 text-sm hover:bg-accent"
        >
          Next
        </button>
      </div>

      {/* Time grid */}
      <div className="relative overflow-y-auto rounded-md border">
        <div
          className="relative"
          style={{ height: `${hours.length * rowHeight}px` }}
        >
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border"
              style={{
                top: `${(hour - startHour) * rowHeight}px`,
                height: `${rowHeight}px`,
              }}
            >
              <span className="absolute left-2 top-1 text-xs text-muted-foreground">
                {hour.toString().padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {/* Appointment blocks */}
          {appointments.map((appt) => {
            const startMin = timeToMinutes(appt.startTime) - startHour * 60;
            const endMin = timeToMinutes(appt.endTime) - startHour * 60;
            const topPx = (startMin / 60) * rowHeight;
            const heightPx = Math.max(
              ((endMin - startMin) / 60) * rowHeight,
              24
            );

            if (startMin < 0 || startMin >= totalMinutes) return null;

            return (
              <div
                key={appt.id}
                className={cn(
                  "absolute left-16 right-2 cursor-pointer overflow-hidden rounded-md border px-2 py-1 text-xs transition-opacity hover:opacity-80",
                  statusColors[appt.status] || "bg-accent"
                )}
                style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                onClick={() => onAppointmentClick(appt.id)}
              >
                <div className="font-semibold">
                  {appt.startTime} - {appt.endTime}
                </div>
                <div className="truncate">
                  {appt.patient?.name || "Unknown"} -{" "}
                  {appt.service?.name || "Service"}
                </div>
                {heightPx > 40 && (
                  <div className="truncate text-[10px] opacity-75">
                    {appt.dentist?.name || ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
