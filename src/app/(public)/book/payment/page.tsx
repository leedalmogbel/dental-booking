"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingProgress } from "@/components/booking/booking-progress";
import { PaymentProofUpload } from "@/components/booking/payment-proof-upload";
import { useBooking } from "@/hooks/use-booking";
import { useClinic } from "@/hooks/use-clinic";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const { state, setAppointmentId, setPaymentProofUploaded } = useBooking();
  const { clinic } = useClinic(clinicSlug);

  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state.service || !state.timeSlot || !state.patientDetails) {
      router.replace(`/book?clinic=${clinicSlug}`);
    }
  }, [state.service, state.timeSlot, state.patientDetails, router, clinicSlug]);

  const handleSubmit = async () => {
    if (!state.service || !state.timeSlot || !state.patientDetails) return;

    setSubmitting(true);

    try {
      // Step 1: Create the booking
      const bookingPayload = {
        clinicId: state.clinicId,
        serviceId: state.service.id,
        dentistId: state.timeSlot.dentistId,
        date: state.date,
        startTime: state.timeSlot.start,
        notes: state.patientDetails.notes || undefined,
      };

      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookRes.ok) {
        const errData = await bookRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create appointment");
      }

      const appointment = await bookRes.json();
      setAppointmentId(appointment.id);

      // Step 2: Upload payment proof if provided
      if (paymentFile) {
        const formData = new FormData();
        formData.append("file", paymentFile);

        const uploadRes = await fetch(
          `/api/bookings/${appointment.id}/payment-proof`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (uploadRes.ok) {
          setPaymentProofUploaded(true);
        } else {
          toast.error("Appointment booked but payment proof upload failed. You can upload it later.");
        }
      }

      toast.success("Appointment booked successfully!");
      router.push(`/book/confirmation?clinic=${clinicSlug}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to book appointment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipPayment = async () => {
    if (!state.service || !state.timeSlot || !state.patientDetails) return;

    setSubmitting(true);

    try {
      const bookingPayload = {
        clinicId: state.clinicId,
        serviceId: state.service.id,
        dentistId: state.timeSlot.dentistId,
        date: state.date,
        startTime: state.timeSlot.start,
        notes: state.patientDetails.notes || undefined,
      };

      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookRes.ok) {
        const errData = await bookRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create appointment");
      }

      const appointment = await bookRes.json();
      setAppointmentId(appointment.id);

      toast.success("Appointment booked successfully!");
      router.push(`/book/confirmation?clinic=${clinicSlug}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to book appointment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!state.service || !state.timeSlot || !state.patientDetails) return null;

  return (
    <div className="space-y-6">
      <BookingProgress currentStep={5} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your payment and upload proof
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/book/details?clinic=${clinicSlug}`)}
          className="gap-1"
          disabled={submitting}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Payment Upload */}
        <PaymentProofUpload
          qrCodeUrl={clinic?.qrCodeUrl}
          amount={state.service.price}
          onFileSelect={setPaymentFile}
          selectedFile={paymentFile}
        />

        {/* Summary Sidebar */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Service:</span>{" "}
              <span className="font-medium">{state.service.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Dentist:</span>{" "}
              <span className="font-medium">
                {state.dentist?.name || state.timeSlot.dentistName}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">{state.date}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Time:</span>{" "}
              <span className="font-medium">{state.timeSlot.start} - {state.timeSlot.end}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Patient:</span>{" "}
              <span className="font-medium">
                {state.patientDetails.firstName} {state.patientDetails.lastName}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount Due</span>
              <span className="text-lg font-bold">
                P{parseFloat(state.service.price).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={handleSkipPayment}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Skip &mdash; Pay at Clinic
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !paymentFile}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Submit Booking
        </Button>
      </div>
    </div>
  );
}
