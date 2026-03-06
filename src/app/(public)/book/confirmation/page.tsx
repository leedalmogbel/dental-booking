"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CalendarDays, Clock, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookingProgress } from "@/components/booking/booking-progress";
import { useBooking } from "@/hooks/use-booking";

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, reset } = useBooking();

  useEffect(() => {
    if (!state.appointmentId) {
      router.replace(`/book?clinic=${clinicSlug}`);
    }
  }, [state.appointmentId, router, clinicSlug]);

  const handleBookAnother = () => {
    reset();
    router.push(`/book?clinic=${clinicSlug}`);
  };

  if (!state.appointmentId || !state.service || !state.timeSlot) return null;

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={6} />

      <div className="mx-auto max-w-lg space-y-6">
        {/* Success Header */}
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            Your appointment has been booked successfully. You will receive a
            confirmation email shortly.
          </p>
        </div>

        {/* Appointment Details */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-semibold">Appointment Details</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: state.service.color }}
                />
                <div>
                  <p className="font-medium">{state.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {state.service.durationMinutes} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {state.dentist?.name || state.timeSlot.dentistName}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{state.date}</p>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {formatTime(state.timeSlot.start)} - {formatTime(state.timeSlot.end)}
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Payment</span>
                </div>
                <Badge
                  variant={state.paymentProofUploaded ? "default" : "outline"}
                >
                  {state.paymentProofUploaded
                    ? "Proof Submitted"
                    : "Pay at Clinic"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold">
                  P{parseFloat(state.service.price).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Info */}
        {state.patientDetails && (
          <Card>
            <CardContent className="space-y-2 p-6">
              <h2 className="font-semibold">Patient Information</h2>
              <p className="text-sm">
                {state.patientDetails.firstName} {state.patientDetails.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.patientDetails.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.patientDetails.phone}
              </p>
              {state.patientDetails.notes && (
                <p className="text-sm text-muted-foreground">
                  Notes: {state.patientDetails.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleBookAnother}>
            Book Another Appointment
          </Button>
          <Link href={`/?clinic=${clinicSlug}`}>
            <Button className="w-full sm:w-auto">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
