"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Dentist {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  workingDays: string[] | null;
  isActive: boolean;
  createdAt: string;
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

export default function DentistsPage() {
  const router = useRouter();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState<
    Record<string, { start: string; end: string }>
  >({});

  useEffect(() => {
    fetchDentists();
  }, []);

  async function fetchDentists() {
    try {
      const res = await fetch("/api/staff/dentists");
      if (res.ok) {
        setDentists(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch dentists:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleDay = (day: string) => {
    setWorkingDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day];

      // Update working hours
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

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setSpecialization("");
    setBio("");
    setWorkingDays([]);
    setWorkingHours({});
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/staff/dentists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          specialization: specialization || undefined,
          bio: bio || undefined,
          workingDays: workingDays.length > 0 ? workingDays : undefined,
          workingHours:
            Object.keys(workingHours).length > 0 ? workingHours : undefined,
        }),
      });

      if (res.ok) {
        toast.success("Dentist added successfully");
        setDialogOpen(false);
        resetForm();
        fetchDentists();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add dentist");
      }
    } catch {
      toast.error("Failed to add dentist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dentists</h1>
          <p className="text-sm text-muted-foreground">
            Manage your clinic&apos;s dental staff.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Dentist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Dentist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@clinic.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Specialization</Label>
                <Input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g., Orthodontics, General"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief bio..."
                  rows={3}
                />
              </div>
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
                            [day]: {
                              ...prev[day],
                              start: e.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        value={workingHours[day]?.end || "17:00"}
                        onChange={(e) =>
                          setWorkingHours((prev) => ({
                            ...prev,
                            [day]: {
                              ...prev[day],
                              end: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Adding..." : "Add Dentist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dentists.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No dentists found. Add your first dentist to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dentists.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/staff/dentists/${d.id}`)}
                  >
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.email}</TableCell>
                    <TableCell>{d.specialization || "General"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {d.workingDays?.map((day) => (
                          <Badge
                            key={day}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {day.slice(0, 3)}
                          </Badge>
                        )) || (
                          <span className="text-muted-foreground">
                            Not set
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.isActive ? "default" : "secondary"}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </Badge>
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
