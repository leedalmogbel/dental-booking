"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ClinicSettings {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  operatingHours: Record<
    string,
    { start: string; end: string }
  > | null;
  qrCodeUrl: string | null;
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

export default function SettingsPage() {
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");

  // Schedule
  const [operatingHours, setOperatingHours] = useState<
    Record<string, { start: string; end: string; closed?: boolean }>
  >({});

  // Payment QR
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/staff/clinic/settings");
        if (res.ok) {
          const data: ClinicSettings = await res.json();
          setClinic(data);
          setName(data.name || "");
          setAddress(data.address || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setLogoUrl(data.logoUrl || "");
          setPrimaryColor(data.primaryColor || "#000000");
          setSecondaryColor(data.secondaryColor || "#ffffff");
          setQrCodeUrl(data.qrCodeUrl || "");

          // Initialize operating hours
          const hours: Record<
            string,
            { start: string; end: string; closed?: boolean }
          > = {};
          for (const day of allDays) {
            const existing = data.operatingHours?.[day];
            hours[day] = existing
              ? { start: existing.start, end: existing.end, closed: false }
              : { start: "09:00", end: "17:00", closed: true };
          }
          setOperatingHours(hours);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/clinic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        }),
      });
      if (res.ok) {
        toast.success("General settings saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/clinic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: logoUrl || undefined,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Branding settings saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const hours: Record<string, { start: string; end: string }> = {};
      for (const [day, val] of Object.entries(operatingHours)) {
        if (!val.closed) {
          hours[day] = { start: val.start, end: val.end };
        }
      }
      const res = await fetch("/api/staff/clinic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingHours: hours }),
      });
      if (res.ok) {
        toast.success("Schedule saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveQr = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/clinic/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeUrl: qrCodeUrl || undefined }),
      });
      if (res.ok) {
        toast.success("Payment QR saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your clinic settings.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payment">Payment QR</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Clinic Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Dental Clinic"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinic@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveGeneral} disabled={saving}>
                  {saving ? "Saving..." : "Save General"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="mt-2 h-16 object-contain"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveBranding} disabled={saving}>
                  {saving ? "Saving..." : "Save Branding"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allDays.map((day) => {
                const hrs = operatingHours[day] || {
                  start: "09:00",
                  end: "17:00",
                  closed: true,
                };
                return (
                  <div
                    key={day}
                    className="grid grid-cols-[120px_auto_1fr_1fr] items-center gap-3"
                  >
                    <span className="text-sm font-medium capitalize">
                      {day}
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!hrs.closed}
                        onChange={(e) =>
                          setOperatingHours((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], closed: !e.target.checked },
                          }))
                        }
                        className="rounded"
                      />
                      Open
                    </label>
                    <Input
                      type="time"
                      value={hrs.start}
                      onChange={(e) =>
                        setOperatingHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], start: e.target.value },
                        }))
                      }
                      disabled={hrs.closed}
                    />
                    <Input
                      type="time"
                      value={hrs.end}
                      onChange={(e) =>
                        setOperatingHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], end: e.target.value },
                        }))
                      }
                      disabled={hrs.closed}
                    />
                  </div>
                );
              })}
              <div className="flex justify-end pt-2">
                <Button onClick={saveSchedule} disabled={saving}>
                  {saving ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>QR Code Image URL</Label>
                <Input
                  value={qrCodeUrl}
                  onChange={(e) => setQrCodeUrl(e.target.value)}
                  placeholder="https://example.com/qr-code.png"
                />
              </div>
              {qrCodeUrl && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Preview
                  </p>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="h-48 rounded-md border object-contain"
                  />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={saveQr} disabled={saving}>
                  {saving ? "Saving..." : "Save QR Code"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
