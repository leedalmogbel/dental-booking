"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

interface ReportData {
  dailyBookings: { date: string; count: number }[];
  revenue: { totalRevenue: string; totalAppointments: number };
  topServices: { serviceName: string | null; bookingCount: number }[];
  dentistProductivity: {
    name: string;
    specialization: string | null;
    appointmentCount: number;
  }[];
  noShowRate: string;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/staff/reports");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Failed to load reports.
      </div>
    );
  }

  const maxBookingCount = Math.max(
    ...data.topServices.map((s) => s.bookingCount),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Analytics and insights for the last 30 days.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Bookings (30d)
                </p>
                <p className="text-2xl font-bold">
                  {data.revenue.totalAppointments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-green-100 text-green-700">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue (30d)</p>
                <p className="text-2xl font-bold">
                  ${Number(data.revenue.totalRevenue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-orange-100 text-orange-700">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  No-show Rate (30d)
                </p>
                <p className="text-2xl font-bold">{data.noShowRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available.
              </p>
            ) : (
              <div className="space-y-3">
                {data.topServices.map((svc, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {svc.serviceName || "Unknown"}
                      </span>
                      <span className="text-muted-foreground">
                        {svc.bookingCount} bookings
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(svc.bookingCount / maxBookingCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dentist Productivity */}
        <Card>
          <CardHeader>
            <CardTitle>Dentist Productivity (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dentistProductivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dentist</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dentistProductivity.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        {d.specialization || "General"}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.appointmentCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Bookings (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No data available.
            </p>
          ) : (
            <div className="flex items-end gap-1 h-40 overflow-x-auto">
              {data.dailyBookings.map((d, i) => {
                const maxCount = Math.max(
                  ...data.dailyBookings.map((b) => b.count),
                  1
                );
                const heightPercent = (d.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="group relative flex-1 min-w-[8px]"
                  >
                    <div
                      className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                    <div className="invisible absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] text-background group-hover:visible whitespace-nowrap">
                      {d.date}: {d.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
