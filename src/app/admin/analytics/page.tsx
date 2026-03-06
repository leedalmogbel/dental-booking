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

interface AnalyticsData {
  totalClinics: number;
  totalAppointments: number;
  totalRevenue: string;
  activeSubscriptions: number;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) {
          setAnalytics(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const stats = analytics
    ? [
        {
          label: "Total Clinics",
          value: analytics.totalClinics,
          icon: Building2,
          color: "bg-blue-100 text-blue-700",
          description: "Total clinics registered on the platform",
        },
        {
          label: "Total Appointments",
          value: analytics.totalAppointments,
          icon: CalendarDays,
          color: "bg-green-100 text-green-700",
          description: "Total appointments booked across all clinics",
        },
        {
          label: "Total Revenue",
          value: `$${Number(analytics.totalRevenue).toLocaleString()}`,
          icon: DollarSign,
          color: "bg-emerald-100 text-emerald-700",
          description: "Total confirmed payment revenue",
        },
        {
          label: "Active Subscriptions",
          value: analytics.activeSubscriptions,
          icon: CreditCard,
          color: "bg-purple-100 text-purple-700",
          description: "Clinics with active subscriptions",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Detailed analytics for the DentalBook platform.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-20" />
                <Skeleton className="mt-2 h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <div
                      className={`flex size-10 items-center justify-center rounded-md ${stat.color}`}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
