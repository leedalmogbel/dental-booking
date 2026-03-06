"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TimeSlot {
  start: string;
  end: string;
}

interface DentistSlots {
  dentistId: string;
  dentistName: string;
  slots: TimeSlot[];
}

interface TimeSlotPickerProps {
  dentistSlots: DentistSlots[];
  selectedSlot: { start: string; dentistId: string } | null;
  onSelectSlot: (slot: TimeSlot, dentistId: string, dentistName: string) => void;
  loading?: boolean;
  earliestSlot?: { dentistId: string; time: string } | null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export function TimeSlotPicker({
  dentistSlots,
  selectedSlot,
  onSelectSlot,
  loading,
  earliestSlot,
}: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (dentistSlots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No available time slots for this date. Please try another date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {earliestSlot && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Earliest available: <span className="font-medium text-foreground">{formatTime(earliestSlot.time)}</span>
          </p>
        </div>
      )}
      {dentistSlots.map((dentist) => (
        <div key={dentist.dentistId} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{dentist.dentistName}</h4>
            <Badge variant="outline" className="text-xs">
              {dentist.slots.length} slots
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {dentist.slots.map((slot) => {
              const isSelected =
                selectedSlot?.start === slot.start &&
                selectedSlot?.dentistId === dentist.dentistId;
              return (
                <Button
                  key={`${dentist.dentistId}-${slot.start}`}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "text-xs",
                    isSelected && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() =>
                    onSelectSlot(slot, dentist.dentistId, dentist.dentistName)
                  }
                >
                  {formatTime(slot.start)}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
