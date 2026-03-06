"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface DentistDetail {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  bio: string | null;
  workingDays: string[] | null;
  workingHours: Record<string, { start: string; end: string }> | null;
  isActive: boolean;
}

const allDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function DentistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [dentist, setDentist] = useState<DentistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState<
    Record<string, { start: string; end: string }>
  >({});

  useEffect(() => {
    async function fetchDentist() {
      try {
        const res = await fetch("/api/staff/dentists");
        if (res.ok) {
          const list: DentistDetail[] = await res.json();
          const found = list.find((d) => d.id === id);
          if (found) {
            setDentist(found);
            setSpecialization(found.specialization || "");
            setBio(found.bio || "");
            setWorkingDays(found.workingDays || []);
            setWorkingHours(
              (found.workingHours as Record<
                string,
                { start: string; end: string }
              >) || {}
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch dentist:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDentist();
  }, [id]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];
      const newHours = { ...workingHours };
      if (next.includes(day) && !newHours[day]) {
        newHours[day] = { start: "09:00", end: "17:00" };
      } else if (!next.includes(day)) {
        delete newHours[day];
      }
      setWorkingHours(newHours);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/dentists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialization: specialization || undefined,
          bio: bio || undefined,
          workingDays,
          workingHours,
        }),
      });
      if (res.ok) {
        toast.success("Dentist updated successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update dentist");
      }
    } catch {
      toast.error("Failed to update dentist");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/dentists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !dentist?.isActive }),
      });
      if (res.ok) {
        setDentist((prev) =>
          prev ? { ...prev, isActive: !prev.isActive } : prev
        );
        toast.success(
          `Dentist ${dentist?.isActive ? "deactivated" : "activated"}`
        );
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
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

  if (!dentist) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Dentist not found.</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/staff/dentists")}
        >
          Back to Dentists
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
          onClick={() => router.push("/staff/dentists")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{dentist.name}</h1>
          <p className="text-sm text-muted-foreground">{dentist.email}</p>
        </div>
        <Badge variant={dentist.isActive ? "default" : "secondary"}>
          {dentist.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant={dentist.isActive ? "destructive" : "default"}
          size="sm"
          onClick={toggleActive}
          disabled={saving}
        >
          {dentist.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g., Orthodontics"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief bio..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {allDays.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={
                      workingDays.includes(day) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleDay(day)}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
            {workingDays.length > 0 && (
              <div className="space-y-2">
                <Label>Working Hours</Label>
                {workingDays.map((day) => (
                  <div
                    key={day}
                    className="grid grid-cols-[100px_1fr_1fr] items-center gap-2 text-sm"
                  >
                    <span className="capitalize">{day}</span>
                    <Input
                      type="time"
                      value={workingHours[day]?.start || "09:00"}
                      onChange={(e) =>
                        setWorkingHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], start: e.target.value },
                        }))
                      }
                    />
                    <Input
                      type="time"
                      value={workingHours[day]?.end || "17:00"}
                      onChange={(e) =>
                        setWorkingHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], end: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
