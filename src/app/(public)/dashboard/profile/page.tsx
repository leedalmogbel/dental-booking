"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  id?: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  dentalConcerns: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

const emptyProfile: ProfileData = {
  dateOfBirth: null,
  gender: null,
  address: null,
  medicalHistory: null,
  allergies: null,
  dentalConcerns: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicSlug = searchParams.get("clinic") || "smile-dental";

  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/patient/profile");
      if (res.status === 401) {
        router.push(`/login?clinic=${clinicSlug}`);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await res.json();
      if (data) {
        setProfile({
          id: data.id,
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || null,
          address: data.address || null,
          medicalHistory:
            typeof data.medicalHistory === "string"
              ? data.medicalHistory
              : data.medicalHistory
                ? JSON.stringify(data.medicalHistory)
                : null,
          allergies:
            typeof data.allergies === "string"
              ? data.allergies
              : data.allergies
                ? JSON.stringify(data.allergies)
                : null,
          dentalConcerns: data.dentalConcerns || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
        });
      }
    } catch {
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, clinicSlug]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: profile.dateOfBirth || null,
          gender: profile.gender || null,
          address: profile.address || null,
          medicalHistory: profile.medicalHistory || null,
          allergies: profile.allergies || null,
          dentalConcerns: profile.dentalConcerns || null,
          emergencyContactName: profile.emergencyContactName || null,
          emergencyContactPhone: profile.emergencyContactPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      toast.success("Profile saved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string | null) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchProfile} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard?clinic=${clinicSlug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Update your personal and medical information
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profile.dateOfBirth || ""}
                  onChange={(e) =>
                    updateField("dateOfBirth", e.target.value || null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={profile.gender || ""}
                  onValueChange={(value) =>
                    updateField("gender", value || null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter your full address"
                value={profile.address || ""}
                onChange={(e) =>
                  updateField("address", e.target.value || null)
                }
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                placeholder="List any existing medical conditions, past surgeries, or ongoing treatments..."
                value={profile.medicalHistory || ""}
                onChange={(e) =>
                  updateField("medicalHistory", e.target.value || null)
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                placeholder="List any known allergies (medications, food, latex, etc.)..."
                value={profile.allergies || ""}
                onChange={(e) =>
                  updateField("allergies", e.target.value || null)
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dentalConcerns">Dental Concerns</Label>
              <Textarea
                id="dentalConcerns"
                placeholder="Describe any dental issues or concerns..."
                value={profile.dentalConcerns || ""}
                onChange={(e) =>
                  updateField("dentalConcerns", e.target.value || null)
                }
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Full name"
                  value={profile.emergencyContactName || ""}
                  onChange={(e) =>
                    updateField(
                      "emergencyContactName",
                      e.target.value || null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={profile.emergencyContactPhone || ""}
                  onChange={(e) =>
                    updateField(
                      "emergencyContactPhone",
                      e.target.value || null
                    )
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
