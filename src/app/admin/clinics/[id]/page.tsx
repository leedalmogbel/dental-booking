"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, CalendarDays, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface ClinicDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  stats: {
    userCount: number;
    appointmentCount: number;
    revenue: string;
  };
}

export default function AdminClinicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  async function fetchClinic() {
    try {
      const res = await fetch(`/api/admin/clinics/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setClinic(data);
        setSelectedTier(data.subscriptionTier);
        setSelectedStatus(data.subscriptionStatus);
      } else {
        toast.error("Clinic not found");
        router.push("/admin/clinics");
      }
    } catch {
      toast.error("Failed to load clinic");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClinic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleUpdate() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/clinics/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionTier: selectedTier,
          subscriptionStatus: selectedStatus,
        }),
      });

      if (res.ok) {
        toast.success("Clinic updated successfully");
        fetchClinic();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update clinic");
      }
    } catch {
      toast.error("Failed to update clinic");
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleActive() {
    const newStatus =
      clinic?.subscriptionStatus === "active" ? "cancelled" : "active";
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/clinics/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      });

      if (res.ok) {
        toast.success(
          `Clinic ${newStatus === "active" ? "activated" : "deactivated"}`
        );
        fetchClinic();
      } else {
        toast.error("Failed to update clinic status");
      }
    } catch {
      toast.error("Failed to update clinic status");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!clinic) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/clinics")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          <p className="text-sm text-muted-foreground">{clinic.slug}</p>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="text-xl font-bold">{clinic.stats.userCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-green-100 text-green-700">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Appointments</p>
                <p className="text-xl font-bold">
                  {clinic.stats.appointmentCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <DollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">
                  ${Number(clinic.stats.revenue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm">{clinic.email || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Phone
              </dt>
              <dd className="text-sm">{clinic.phone || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Address
              </dt>
              <dd className="text-sm">{clinic.address || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Created
              </dt>
              <dd className="text-sm">
                {new Date(clinic.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription Management</CardTitle>
            <Badge
              variant={
                clinic.subscriptionStatus === "active" ? "default" : "secondary"
              }
              className="capitalize"
            >
              {clinic.subscriptionStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant={
                clinic.subscriptionStatus === "active"
                  ? "destructive"
                  : "default"
              }
              onClick={handleToggleActive}
              disabled={updating}
            >
              {clinic.subscriptionStatus === "active"
                ? "Deactivate Clinic"
                : "Activate Clinic"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
