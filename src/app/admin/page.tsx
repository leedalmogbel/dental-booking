"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CalendarDays,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  totalClinics: number;
  totalAppointments: number;
  totalRevenue: string;
  activeSubscriptions: number;
}

interface Clinic {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

export default function AdminOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, clinicsRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/clinics"),
        ]);

        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json());
        }
        if (clinicsRes.ok) {
          const data = await clinicsRes.json();
          setClinics(data.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = analytics
    ? [
        {
          label: "Total Clinics",
          value: analytics.totalClinics,
          icon: Building2,
          color: "bg-blue-100 text-blue-700",
        },
        {
          label: "Total Appointments",
          value: analytics.totalAppointments,
          icon: CalendarDays,
          color: "bg-green-100 text-green-700",
        },
        {
          label: "Total Revenue",
          value: `$${Number(analytics.totalRevenue).toLocaleString()}`,
          icon: DollarSign,
          color: "bg-emerald-100 text-emerald-700",
        },
        {
          label: "Active Subscriptions",
          value: analytics.activeSubscriptions,
          icon: CreditCard,
          color: "bg-purple-100 text-purple-700",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to the DentalBook admin panel.
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-md" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-md ${stat.color}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent Clinics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinics yet.</p>
          ) : (
            <div className="space-y-3">
              {clinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{clinic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {clinic.slug} {clinic.email ? `| ${clinic.email}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {clinic.subscriptionTier}
                    </Badge>
                    <Badge
                      variant={
                        clinic.subscriptionStatus === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {clinic.subscriptionStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
