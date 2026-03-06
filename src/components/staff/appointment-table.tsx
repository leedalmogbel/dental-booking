"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface AppointmentRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentAmount: string | null;
  service: { name: string; durationMinutes: number; price: string } | null;
  dentist: { name: string; specialization: string | null } | null;
  patient: { name: string; email: string; phone: string | null } | null;
}

interface AppointmentTableProps {
  appointments: AppointmentRow[];
  loading?: boolean;
  onRowClick?: (id: string) => void;
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

export function AppointmentTable({
  appointments,
  loading,
  onRowClick,
}: AppointmentTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No appointments found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Dentist</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appt) => (
          <TableRow
            key={appt.id}
            className={onRowClick ? "cursor-pointer" : ""}
            onClick={() => onRowClick?.(appt.id)}
          >
            <TableCell>
              <div>
                <p className="font-medium">{appt.patient?.name || "N/A"}</p>
                <p className="text-xs text-muted-foreground">
                  {appt.patient?.email || ""}
                </p>
              </div>
            </TableCell>
            <TableCell>{appt.service?.name || "N/A"}</TableCell>
            <TableCell>{appt.dentist?.name || "N/A"}</TableCell>
            <TableCell>{appt.date}</TableCell>
            <TableCell>
              {appt.startTime} - {appt.endTime}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={statusColors[appt.status] || ""}
              >
                {appt.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={paymentColors[appt.paymentStatus] || ""}
              >
                {appt.paymentStatus.replace("_", " ")}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
