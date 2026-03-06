"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { BookingProgress } from "@/components/booking/booking-progress";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { useBooking } from "@/hooks/use-booking";

interface TimeSlot {
  start: string;
  end: string;
}

interface DentistSlots {
  dentistId: string;
  dentistName: string;
  slots: TimeSlot[];
}

interface SlotsResponse {
  dentists: DentistSlots[];
  earliestSlot: { dentistId: string; time: string } | null;
}

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, setDate, setTimeSlot, setDentist } = useBooking();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    state.date ? new Date(state.date + "T00:00:00") : undefined
  );
  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{
    start: string;
    dentistId: string;
  } | null>(
    state.timeSlot
      ? { start: state.timeSlot.start, dentistId: state.timeSlot.dentistId }
      : null
  );

  useEffect(() => {
    if (!state.service) {
      router.replace(`/book?clinic=${clinicSlug}`);
    }
  }, [state.service, router, clinicSlug]);

  const fetchSlots = useCallback(
    async (date: Date) => {
      if (!state.clinicId || !state.service) return;

      setLoadingSlots(true);
      setSlotsData(null);
      setSelectedSlotInfo(null);

      try {
        const dateStr = format(date, "yyyy-MM-dd");
        const params = new URLSearchParams({
          clinicId: state.clinicId,
          serviceId: state.service.id,
          date: dateStr,
        });
        if (state.dentist) {
          params.set("dentistId", state.dentist.id);
        }

        const res = await fetch(`/api/bookings/slots?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load time slots");
        const data: SlotsResponse = await res.json();
        setSlotsData(data);
      } catch {
        toast.error("Failed to load available time slots.");
      } finally {
        setLoadingSlots(false);
      }
    },
    [state.clinicId, state.service, state.dentist]
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setDate(format(date, "yyyy-MM-dd"));
    fetchSlots(date);
  };

  const handleSlotSelect = (
    slot: TimeSlot,
    dentistId: string,
    dentistName: string
  ) => {
    setSelectedSlotInfo({ start: slot.start, dentistId });
    setTimeSlot({
      start: slot.start,
      end: slot.end,
      dentistId,
      dentistName,
    });
    // If the user skipped dentist selection, set the dentist now
    if (!state.dentist) {
      setDentist({
        id: dentistId,
        name: dentistName,
      });
    }
  };

  const handleContinue = () => {
    if (!state.timeSlot) {
      toast.error("Please select a time slot to continue.");
      return;
    }
    router.push(`/book/details?clinic=${clinicSlug}`);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!state.service) return null;

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={3} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Choose Date & Time</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your preferred date and available time slot
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/book/dentist?clinic=${clinicSlug}`)}
          className="gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < today}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedDate
                ? `Available Times for ${format(selectedDate, "MMMM d, yyyy")}`
                : "Select a date first"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Pick a date from the calendar to see available times
                </p>
              </div>
            ) : (
              <TimeSlotPicker
                dentistSlots={slotsData?.dentists ?? []}
                selectedSlot={selectedSlotInfo}
                onSelectSlot={handleSlotSelect}
                loading={loadingSlots}
                earliestSlot={slotsData?.earliestSlot}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Continue Button */}
      {state.timeSlot && (
        <div className="flex justify-end">
          <Button onClick={handleContinue} className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
