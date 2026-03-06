"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AppointmentCard } from "@/components/patient/appointment-card";
import { CalendarPlus, CalendarDays, History, AlertCircle } from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  cancellationReason: string | null;
  paymentStatus: string;
  paymentAmount: string | null;
  createdAt: string;
  service: { name: string; durationMinutes: number; price: string } | null;
  dentist: { name: string; specialization?: string | null } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/patient/appointments");
      if (res.status === 401) {
        router.push(`/login?clinic=${clinicSlug}`);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load appointments");
      }
      const data = await res.json();
      setAppointments(data);
    } catch {
      setError("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, clinicSlug]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter(
    (a) => a.date >= today && a.status !== "cancelled" && a.status !== "completed"
  );
  const past = appointments.filter(
    (a) => a.date < today || a.status === "cancelled" || a.status === "completed"
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchAppointments} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your appointments and medical records
          </p>
        </div>
        <Link href={`/book?clinic=${clinicSlug}`}>
          <Button>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book New Appointment
          </Button>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">No upcoming appointments</p>
              <Link href={`/book?clinic=${clinicSlug}`}>
                <Button variant="outline" size="sm">
                  Book an appointment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Past Appointments */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Past Appointments</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {past.length}
          </span>
        </div>
        {past.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No past appointments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {past.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={`/dashboard/history?clinic=${clinicSlug}`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Treatment History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View your complete treatment records and diagnoses
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/profile?clinic=${clinicSlug}`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Update your personal and medical information
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
