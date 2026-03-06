"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatsCards, type StatCardData } from "@/components/staff/stats-cards";
import {
  AppointmentTable,
  type AppointmentRow,
} from "@/components/staff/appointment-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  Plus,
  Stethoscope,
  Scissors,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  today: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
  };
  pendingPayments: number;
  totalRevenue: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<
    AppointmentRow[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [dashRes, apptRes] = await Promise.all([
          fetch("/api/staff/dashboard"),
          fetch(
            `/api/staff/appointments?dateFrom=${today}&dateTo=${today}`
          ),
        ]);

        if (dashRes.ok) {
          setDashboard(await dashRes.json());
        }
        if (apptRes.ok) {
          setTodayAppointments(await apptRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats: StatCardData[] = dashboard
    ? [
        {
          label: "Today's Appts",
          value: dashboard.today.total,
          icon: CalendarDays,
          color: "bg-blue-100 text-blue-700",
        },
        {
          label: "Pending",
          value: dashboard.today.pending,
          icon: Clock,
          color: "bg-yellow-100 text-yellow-700",
        },
        {
          label: "Confirmed",
          value: dashboard.today.confirmed,
          icon: AlertCircle,
          color: "bg-indigo-100 text-indigo-700",
        },
        {
          label: "Completed",
          value: dashboard.today.completed,
          icon: CheckCircle2,
          color: "bg-green-100 text-green-700",
        },
        {
          label: "Pending Payments",
          value: dashboard.pendingPayments,
          icon: CreditCard,
          color: "bg-orange-100 text-orange-700",
        },
        {
          label: "Revenue",
          value: `$${Number(dashboard.totalRevenue).toLocaleString()}`,
          icon: DollarSign,
          color: "bg-emerald-100 text-emerald-700",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Here is your clinic overview.
          </p>
        </div>
      </div>

      <StatsCards stats={stats} loading={loading} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/staff/appointments">
            <Plus className="size-4" />
            Add Appointment
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/staff/dentists">
            <Stethoscope className="size-4" />
            Add Dentist
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/staff/services">
            <Scissors className="size-4" />
            Add Service
          </Link>
        </Button>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentTable
            appointments={todayAppointments}
            loading={loading}
            onRowClick={(id) => router.push(`/staff/appointments/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
