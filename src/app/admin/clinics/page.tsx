"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Clinic {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

export default function AdminClinicsPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("starter");

  async function fetchClinics() {
    try {
      const res = await fetch("/api/admin/clinics");
      if (res.ok) {
        setClinics(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch clinics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClinics();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, email, address, subscriptionTier }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create clinic");
        return;
      }

      toast.success("Clinic created successfully");
      setDialogOpen(false);
      setName("");
      setSlug("");
      setEmail("");
      setAddress("");
      setSubscriptionTier("starter");
      fetchClinics();
    } catch {
      toast.error("Failed to create clinic");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(clinic: Clinic) {
    const newStatus =
      clinic.subscriptionStatus === "active" ? "cancelled" : "active";
    try {
      const res = await fetch(`/api/admin/clinics/${clinic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      });

      if (res.ok) {
        toast.success(
          `Clinic ${newStatus === "active" ? "activated" : "deactivated"}`
        );
        fetchClinics();
      } else {
        toast.error("Failed to update clinic status");
      }
    } catch {
      toast.error("Failed to update clinic status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clinics</h1>
          <p className="text-sm text-muted-foreground">
            Manage all clinics on the platform.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Clinic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Clinic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Clinic Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Dental Clinic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="my-dental-clinic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinic@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select
                  value={subscriptionTier}
                  onValueChange={setSubscriptionTier}
                >
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
              <Button
                onClick={handleCreate}
                disabled={!name || !slug || creating}
                className="w-full"
              >
                {creating ? "Creating..." : "Create Clinic"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinics found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.map((clinic) => (
                  <TableRow
                    key={clinic.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/clinics/${clinic.id}`)}
                  >
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>{clinic.slug}</TableCell>
                    <TableCell>{clinic.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {clinic.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={
                          clinic.subscriptionStatus === "active"
                            ? "destructive"
                            : "default"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(clinic);
                        }}
                      >
                        {clinic.subscriptionStatus === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </Button>
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
