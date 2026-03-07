"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CalendarDays, Clock, User, CreditCard, Mail, ArrowRight } from "lucide-react";
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

      <div className="mx-auto max-w-lg space-y-8">
        {/* Success Header */}
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 shadow-lg shadow-green-200/50">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Booking Confirmed!</h1>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Your appointment has been booked successfully. You will receive a
              confirmation email shortly.
            </p>
          </div>
        </div>

        {/* Appointment Details */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/60" />
          <CardContent className="space-y-5 p-6">
            <h2 className="text-base font-semibold">Appointment Details</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: state.service.color + "20" }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: state.service.color }}
                  />
                </div>
                <div>
                  <p className="font-medium">{state.service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {state.service.durationMinutes} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {state.dentist?.name || state.timeSlot.dentistName}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{state.date}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  {formatTime(state.timeSlot.start)} - {formatTime(state.timeSlot.end)}
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
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

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold">
                  P{parseFloat(state.service.price).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Info */}
        {state.patientDetails && (
          <Card className="border-none shadow-md">
            <CardContent className="space-y-3 p-6">
              <h2 className="text-base font-semibold">Patient Information</h2>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest User Prompt */}
        <Card className="border border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">Manage your booking</p>
              <p className="text-sm text-blue-700/80">
                You can manage your booking by logging in with your email using
                the Email Code option.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={handleBookAnother}
            className="gap-2"
          >
            Book Another Appointment
          </Button>
          <Link href={`/?clinic=${clinicSlug}`} className="w-full sm:w-auto">
            <Button className="w-full gap-2">
              Back to Home
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
