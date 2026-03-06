"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

interface AppointmentDetail {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  paymentStatus: string;
  paymentAmount: string | null;
  paymentProofUrl: string | null;
  createdAt: string;
  service: { name: string; durationMinutes: number; price: string } | null;
  dentist: { name: string; specialization: string | null } | null;
  patient: { name: string; email: string; phone: string | null } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-gray-100 text-gray-800",
  proof_submitted: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  refunded: "bg-red-100 text-red-800",
};

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await fetch("/api/staff/appointments");
        if (res.ok) {
          const list: AppointmentDetail[] = await res.json();
          const found = list.find((a) => a.id === id);
          if (found) {
            setAppointment(found);
            setNotes(found.notes || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch appointment:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointment();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointment((prev) =>
          prev ? { ...prev, status: updated.status } : prev
        );
        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const updatePaymentStatus = async (paymentStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointment((prev) =>
          prev
            ? { ...prev, paymentStatus: updated.paymentStatus }
            : prev
        );
        toast.success(`Payment ${paymentStatus}`);
      } else {
        toast.error("Failed to update payment status");
      }
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        toast.success("Notes saved");
      } else {
        toast.error("Failed to save notes");
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Appointment not found.</p>
        <Button className="mt-4" onClick={() => router.push("/staff/appointments")}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/staff/appointments")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Appointment Detail</h1>
          <p className="text-sm text-muted-foreground">
            {appointment.date} at {appointment.startTime}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{appointment.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium">
                  {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Service</p>
                <p className="font-medium">
                  {appointment.service?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Price</p>
                <p className="font-medium">
                  ${appointment.service?.price || "0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Dentist</p>
                <p className="font-medium">
                  {appointment.dentist?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={statusColors[appointment.status] || ""}
                >
                  {appointment.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* Status Update */}
            <div className="space-y-1.5 pt-2">
              <Label>Update Status</Label>
              <Select
                value={appointment.status}
                onValueChange={updateStatus}
                disabled={saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">
                {appointment.patient?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">
                {appointment.patient?.email || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">
                {appointment.patient?.phone || "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Management */}
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">
                  ${appointment.paymentAmount || "0"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={
                    paymentColors[appointment.paymentStatus] || ""
                  }
                >
                  {appointment.paymentStatus.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {appointment.paymentProofUrl && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Payment Proof
                </p>
                <img
                  src={appointment.paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-48 rounded-md border object-contain"
                />
              </div>
            )}

            {appointment.paymentStatus === "proof_submitted" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updatePaymentStatus("confirmed")}
                  disabled={saving}
                >
                  <CheckCircle className="size-4" />
                  Confirm Payment
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updatePaymentStatus("unpaid")}
                  disabled={saving}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Add notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <Button size="sm" onClick={saveNotes} disabled={saving}>
              Save Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
