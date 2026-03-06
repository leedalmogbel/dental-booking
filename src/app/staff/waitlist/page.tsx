"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Bell, CalendarCheck, XCircle } from "lucide-react";

interface WaitlistEntry {
  id: string;
  preferredDate: string | null;
  preferredTimeRange: { start: string; end: string } | null;
  status: string;
  createdAt: string;
  service: string | null;
  patient: { name: string; email: string } | null;
  preferredDentist: { name: string } | null;
}

const statusColors: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  notified: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  async function fetchWaitlist() {
    try {
      const res = await fetch("/api/staff/waitlist");
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch waitlist:", err);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (
    id: string,
    status: "notified" | "booked" | "expired"
  ) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/staff/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(
          `Status updated to ${status}`
        );
        fetchWaitlist();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waitlist</h1>
        <p className="text-sm text-muted-foreground">
          Manage patients waiting for appointment slots.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No waitlist entries.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Preferred Date</TableHead>
                  <TableHead>Preferred Time</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {entry.patient?.name || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.patient?.email || ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{entry.service || "N/A"}</TableCell>
                    <TableCell>{entry.preferredDate || "Any"}</TableCell>
                    <TableCell>
                      {entry.preferredTimeRange
                        ? `${entry.preferredTimeRange.start} - ${entry.preferredTimeRange.end}`
                        : "Any"}
                    </TableCell>
                    <TableCell>
                      {entry.preferredDentist?.name || "Any"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[entry.status] || ""}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.status === "waiting" && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateStatus(entry.id, "notified")
                            }
                            disabled={updating === entry.id}
                          >
                            <Bell className="size-3" />
                            Notify
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus(entry.id, "booked")
                            }
                            disabled={updating === entry.id}
                          >
                            <CalendarCheck className="size-3" />
                            Booked
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateStatus(entry.id, "expired")
                            }
                            disabled={updating === entry.id}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      )}
                      {entry.status === "notified" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatus(entry.id, "booked")
                            }
                            disabled={updating === entry.id}
                          >
                            <CalendarCheck className="size-3" />
                            Booked
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateStatus(entry.id, "expired")
                            }
                            disabled={updating === entry.id}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
