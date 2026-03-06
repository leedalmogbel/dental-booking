"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentAppointment {
  id: string;
  date: string;
  startTime: string;
  paymentStatus: string;
  paymentAmount: string | null;
  paymentProofUrl: string | null;
  service: { name: string } | null;
  patient: { name: string; email: string } | null;
  dentist: { name: string } | null;
}

export default function PaymentsPage() {
  const [appointments, setAppointments] = useState<PaymentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const res = await fetch("/api/staff/appointments");
      if (res.ok) {
        const data: PaymentAppointment[] = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }

  const updatePayment = async (id: string, paymentStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      if (res.ok) {
        toast.success(`Payment ${paymentStatus}`);
        fetchAppointments();
      } else {
        toast.error("Failed to update payment");
      }
    } catch {
      toast.error("Failed to update payment");
    } finally {
      setUpdating(null);
    }
  };

  const pendingReview = appointments.filter(
    (a) => a.paymentStatus === "proof_submitted"
  );
  const confirmed = appointments.filter(
    (a) => a.paymentStatus === "confirmed"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Review and manage appointment payments.
        </p>
      </div>

      {/* Pending Review */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Review ({pendingReview.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pendingReview.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No payments pending review.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReview.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">
                      {appt.patient?.name || "N/A"}
                    </TableCell>
                    <TableCell>{appt.service?.name || "N/A"}</TableCell>
                    <TableCell>{appt.date}</TableCell>
                    <TableCell>${appt.paymentAmount || "0"}</TableCell>
                    <TableCell>
                      {appt.paymentProofUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProofUrl(appt.paymentProofUrl)}
                        >
                          <ImageIcon className="size-4" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            updatePayment(appt.id, "confirmed")
                          }
                          disabled={updating === appt.id}
                        >
                          <CheckCircle className="size-4" />
                          Confirm
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            updatePayment(appt.id, "unpaid")
                          }
                          disabled={updating === appt.id}
                        >
                          <XCircle className="size-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmed Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmed Payments ({confirmed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : confirmed.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No confirmed payments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmed.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">
                      {appt.patient?.name || "N/A"}
                    </TableCell>
                    <TableCell>{appt.service?.name || "N/A"}</TableCell>
                    <TableCell>{appt.date}</TableCell>
                    <TableCell>${appt.paymentAmount || "0"}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        Confirmed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Proof Image Dialog */}
      <Dialog
        open={!!proofUrl}
        onOpenChange={(open) => !open && setProofUrl(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {proofUrl && (
            <img
              src={proofUrl}
              alt="Payment proof"
              className="max-h-96 w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
