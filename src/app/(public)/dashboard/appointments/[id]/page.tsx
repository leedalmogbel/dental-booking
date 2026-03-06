"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  CreditCard,
  AlertCircle,
  XCircle,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface AppointmentDetail {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  cancellationReason: string | null;
  paymentStatus: string;
  paymentAmount: string | null;
  paymentProofUrl: string | null;
  createdAt: string;
  service: { name: string; durationMinutes: number; price: string } | null;
  dentist: { name: string; specialization?: string | null } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-800 border-gray-200",
};

const paymentColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AppointmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const fetchAppointment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${appointmentId}`);
      if (res.status === 401) {
        router.push(`/login?clinic=${clinicSlug}`);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load appointment details");
      }
      const data = await res.json();
      setAppointment(data);
    } catch {
      setError("Failed to load appointment details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, router, clinicSlug]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel appointment");
      }

      toast.success("Appointment cancelled successfully");
      setCancelDialogOpen(false);
      fetchAppointment();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel appointment"
      );
    } finally {
      setCancelling(false);
    }
  };

  const canCancel =
    appointment &&
    (appointment.status === "pending" || appointment.status === "confirmed");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">
          {error || "Appointment not found"}
        </p>
        <div className="flex gap-2">
          <Button onClick={fetchAppointment} variant="outline">
            Try Again
          </Button>
          <Link href={`/dashboard?clinic=${clinicSlug}`}>
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard?clinic=${clinicSlug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Appointment Details</h1>
          <p className="text-sm text-muted-foreground">
            {appointment.service?.name || "Appointment"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">
              {appointment.service?.name || "Unknown Service"}
            </CardTitle>
            <Badge
              variant="outline"
              className={statusColors[appointment.status] || ""}
            >
              {formatStatus(appointment.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(appointment.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.startTime)} -{" "}
                  {formatTime(appointment.endTime)}
                </p>
              </div>
            </div>

            {appointment.dentist && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dentist</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.dentist.name}
                  </p>
                  {appointment.dentist.specialization && (
                    <p className="text-xs text-muted-foreground">
                      {appointment.dentist.specialization}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Payment</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      paymentColors[appointment.paymentStatus] || ""
                    }
                  >
                    {formatStatus(appointment.paymentStatus)}
                  </Badge>
                  {appointment.paymentAmount && (
                    <span className="text-sm text-muted-foreground">
                      ${appointment.paymentAmount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {appointment.cancellationReason && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Cancellation Reason
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.cancellationReason}
                  </p>
                </div>
              </div>
            </>
          )}

          {appointment.paymentProofUrl && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <ImageIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Payment Proof</p>
                  <a
                    href={appointment.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block"
                  >
                    <img
                      src={appointment.paymentProofUrl}
                      alt="Payment proof"
                      className="max-h-48 rounded-md border object-contain"
                    />
                  </a>
                </div>
              </div>
            </>
          )}

          {appointment.service?.price && (
            <>
              <Separator />
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <span className="text-sm font-medium">Service Price</span>
                <span className="text-lg font-semibold">
                  ${appointment.service.price}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Appointment */}
      {canCancel && (
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border p-3">
              <p className="font-medium">
                {appointment.service?.name || "Appointment"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(appointment.date)} at{" "}
                {formatTime(appointment.startTime)}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
