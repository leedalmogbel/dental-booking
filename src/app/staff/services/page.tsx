"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  requiredSpecialization: string | null;
  preInstructions: string | null;
  color: string | null;
  isActive: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [price, setPrice] = useState("");
  const [requiredSpecialization, setRequiredSpecialization] = useState("");
  const [preInstructions, setPreInstructions] = useState("");
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      const res = await fetch("/api/staff/services");
      if (res.ok) {
        setServices(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch services:", err);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setName("");
    setDescription("");
    setDurationMinutes("");
    setPrice("");
    setRequiredSpecialization("");
    setPreInstructions("");
    setColor("#3b82f6");
    setEditingService(null);
  };

  const openEditDialog = (svc: Service) => {
    setEditingService(svc);
    setName(svc.name);
    setDescription(svc.description || "");
    setDurationMinutes(String(svc.durationMinutes));
    setPrice(svc.price);
    setRequiredSpecialization(svc.requiredSpecialization || "");
    setPreInstructions(svc.preInstructions || "");
    setColor(svc.color || "#3b82f6");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !durationMinutes || !price) {
      toast.error("Name, duration, and price are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        durationMinutes: parseInt(durationMinutes),
        price,
        requiredSpecialization: requiredSpecialization || undefined,
        preInstructions: preInstructions || undefined,
        color: color || undefined,
      };

      let res: Response;
      if (editingService) {
        res = await fetch(`/api/staff/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/staff/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(
          editingService
            ? "Service updated successfully"
            : "Service created successfully"
        );
        setDialogOpen(false);
        resetForm();
        fetchServices();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save service");
      }
    } catch {
      toast.error("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage dental services offered by your clinic.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Teeth Cleaning"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Duration (minutes) *</Label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Required Specialization</Label>
                <Input
                  value={requiredSpecialization}
                  onChange={(e) => setRequiredSpecialization(e.target.value)}
                  placeholder="e.g., Orthodontics"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pre-Instructions</Label>
                <Textarea
                  value={preInstructions}
                  onChange={(e) => setPreInstructions(e.target.value)}
                  placeholder="Instructions for patients before the appointment..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingService
                    ? "Update Service"
                    : "Add Service"}
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
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No services found. Add your first service.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell>
                      <div
                        className="size-5 rounded-full border"
                        style={{
                          backgroundColor: svc.color || "#3b82f6",
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{svc.name}</TableCell>
                    <TableCell>{svc.durationMinutes} min</TableCell>
                    <TableCell>${svc.price}</TableCell>
                    <TableCell>
                      {svc.requiredSpecialization || "Any"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={svc.isActive ? "default" : "secondary"}
                      >
                        {svc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(svc)}
                      >
                        <Pencil className="size-4" />
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
