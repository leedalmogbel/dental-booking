"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

interface PatientAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentAmount: string | null;
  serviceName: string | null;
  dentistSpecialization: string | null;
}

interface TreatmentRecord {
  id: string;
  diagnosis: string | null;
  proceduresDone: string | null;
  notes: string | null;
  createdAt: string;
}

interface PatientDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  profile: { dateOfBirth?: string; allergies?: string[] } | null;
  appointments: PatientAppointment[];
  treatmentRecords: TreatmentRecord[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Treatment record form
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [proceduresDone, setProceduresDone] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/staff/patients/${id}`);
        if (res.ok) {
          setPatient(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch patient:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [id]);

  const addTreatmentRecord = async () => {
    if (!selectedAppointmentId) {
      toast.error("Please select an appointment");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/staff/treatment-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: selectedAppointmentId,
          diagnosis: diagnosis || undefined,
          proceduresDone: proceduresDone || undefined,
          notes: treatmentNotes || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Treatment record added");
        setDialogOpen(false);
        setSelectedAppointmentId("");
        setDiagnosis("");
        setProceduresDone("");
        setTreatmentNotes("");
        // Refetch patient data
        const patientRes = await fetch(`/api/staff/patients/${id}`);
        if (patientRes.ok) setPatient(await patientRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add treatment record");
      }
    } catch {
      toast.error("Failed to add treatment record");
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

  if (!patient) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/staff/patients")}
        >
          Back to Patients
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
          onClick={() => router.push("/staff/patients")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{patient.email}</p>
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{patient.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {new Date(patient.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History ({patient.appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No appointments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.appointments.map((appt) => (
                  <TableRow
                    key={appt.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/staff/appointments/${appt.id}`)
                    }
                  >
                    <TableCell>{appt.date}</TableCell>
                    <TableCell>
                      {appt.startTime} - {appt.endTime}
                    </TableCell>
                    <TableCell>{appt.serviceName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[appt.status] || ""}
                      >
                        {appt.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>${appt.paymentAmount || "0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Treatment Records */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Treatment Records ({patient.treatmentRecords.length})
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Treatment Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Appointment *</Label>
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={selectedAppointmentId}
                    onChange={(e) =>
                      setSelectedAppointmentId(e.target.value)
                    }
                  >
                    <option value="">Select an appointment</option>
                    {patient.appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.date} - {a.serviceName || "Service"} ({a.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnosis</Label>
                  <Input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Diagnosis..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Procedures Done</Label>
                  <Textarea
                    value={proceduresDone}
                    onChange={(e) => setProceduresDone(e.target.value)}
                    placeholder="Procedures performed..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={treatmentNotes}
                    onChange={(e) => setTreatmentNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={addTreatmentRecord} disabled={saving}>
                  {saving ? "Saving..." : "Add Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {patient.treatmentRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No treatment records found.
            </p>
          ) : (
            <div className="space-y-4">
              {patient.treatmentRecords.map((rec) => (
                <div key={rec.id} className="rounded-md border p-4 text-sm">
                  <div className="mb-2 text-xs text-muted-foreground">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </div>
                  {rec.diagnosis && (
                    <div className="mb-1">
                      <span className="font-medium">Diagnosis:</span>{" "}
                      {rec.diagnosis}
                    </div>
                  )}
                  {rec.proceduresDone && (
                    <div className="mb-1">
                      <span className="font-medium">Procedures:</span>{" "}
                      {rec.proceduresDone}
                    </div>
                  )}
                  {rec.notes && (
                    <div className="text-muted-foreground">
                      Notes: {rec.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
