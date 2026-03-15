# Staff Calendar Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the staff dashboard with a react-big-calendar view showing all bookings, with side panel, appointment modals, drag-and-drop rescheduling, and filterable color coding.

**Architecture:** New `react-big-calendar` based page at `/staff` with `withDragAndDrop` addon. Calendar + collapsible side panel layout. Existing PATCH API extended for reschedule, GET extended for color-coding fields. Old custom calendar components removed.

**Tech Stack:** Next.js 16 (App Router), React 19, react-big-calendar + date-fns localizer, Tailwind CSS v4, shadcn/ui (Dialog, Button, Select), Drizzle ORM, Zod validation.

**Spec:** `docs/superpowers/specs/2026-03-13-staff-calendar-dashboard-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/staff/booking-calendar.tsx` | Create | Main react-big-calendar wrapper with DnD, event rendering, color coding |
| `src/components/staff/calendar-toolbar.tsx` | Create | Custom toolbar: navigation, view switcher (Month/Week/Day), color mode dropdown |
| `src/components/staff/calendar-side-panel.tsx` | Create | Collapsible right panel: today's schedule list + quick stats |
| `src/components/staff/appointment-detail-modal.tsx` | Create | Modal: appointment details + status action buttons |
| `src/components/staff/create-appointment-modal.tsx` | Create | Modal: create appointment from empty slot click |
| `src/lib/calendar-utils.ts` | Create | Color maps, event mapping helpers, shared types |
| `src/app/staff/page.tsx` | Rewrite | New landing page composing calendar + side panel + modals |
| `src/app/api/staff/appointments/route.ts` | Modify | Add dentistId, serviceId, serviceColor to GET response |
| `src/app/api/staff/appointments/[id]/route.ts` | Modify | Extend PATCH schema with date/startTime/endTime + overlap validation |
| `src/components/staff/calendar-day-view.tsx` | Delete | Replaced by react-big-calendar |
| `src/components/staff/calendar-week-view.tsx` | Delete | Replaced by react-big-calendar |
| `src/app/staff/calendar/page.tsx` | Delete | `/staff` is now the calendar |

---

## Chunk 1: Dependencies, API Changes, and Utilities

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install react-big-calendar and types**

```bash
npm install react-big-calendar @types/react-big-calendar
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('react-big-calendar'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-big-calendar dependency"
```

---

### Task 2: Extend GET /api/staff/appointments response

**Files:**
- Modify: `src/app/api/staff/appointments/route.ts`

- [ ] **Step 1: Add serviceColor to the select query**

In the `db.select()` call, add `serviceColor: services.color` to the selected fields. The `services` table already has a `color` column (varchar(7), default "#3B82F6").

Add to the select object (after line 59 `servicePrice: services.price`):

```typescript
serviceColor: services.color,
```

- [ ] **Step 2: Add dentistId, serviceId, serviceColor to the response mapping**

In the `rows.map()` result object (around line 76), add these three fields:

```typescript
const result = rows.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    notes: r.notes,
    paymentStatus: r.paymentStatus,
    paymentAmount: r.paymentAmount,
    paymentProofUrl: r.paymentProofUrl,
    createdAt: r.createdAt,
    dentistId: r.dentistId,     // ADD
    serviceId: r.serviceId,     // ADD
    service: r.serviceName
      ? { name: r.serviceName, durationMinutes: r.serviceDuration, price: r.servicePrice, color: r.serviceColor }
      : null,
    dentist: r.dentistFirstName
      ? { name: `Dr. ${r.dentistFirstName} ${r.dentistLastName}`, specialization: r.dentistSpecialization }
      : null,
    patient: r.patientFirstName
      ? { name: `${r.patientFirstName} ${r.patientLastName}`, email: r.patientEmail, phone: r.patientPhone }
      : null,
  }));
```

Note: `dentistId` and `serviceId` need to be added to the select query too. Add:

```typescript
dentistId: appointments.dentistId,
serviceId: appointments.serviceId,
```

- [ ] **Step 3: Verify the API compiles**

```bash
npx next build --no-lint 2>&1 | head -30
```

Or start the dev server and curl the endpoint. Expected: no TypeScript errors related to this file.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/staff/appointments/route.ts
git commit -m "feat: add dentistId, serviceId, serviceColor to appointments GET response"
```

---

### Task 3: Extend PATCH /api/staff/appointments/[id] with reschedule fields + overlap validation

**Files:**
- Modify: `src/app/api/staff/appointments/[id]/route.ts`

- [ ] **Step 1: Extend the Zod update schema**

Add `date`, `startTime`, `endTime` to the existing `updateSchema`:

```typescript
const updateSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
    .optional(),
  paymentStatus: z
    .enum(["unpaid", "proof_submitted", "confirmed", "refunded"])
    .optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm").optional(),
});
```

- [ ] **Step 2: Add overlap validation before update**

Import `sql`, `not` from drizzle-orm. After `parsed` validation succeeds and before the `db.update()` call, add overlap detection when reschedule fields are present:

```typescript
import { eq, and, not, sql } from "drizzle-orm";

// ... inside PATCH handler, after parsed validation:

const { date, startTime, endTime, ...otherFields } = parsed.data;

// If rescheduling, validate no overlap
if (date || startTime || endTime) {
  // Get the current appointment to fill in missing fields
  const [current] = await db
    .select({
      dentistId: appointments.dentistId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.clinicId, user!.clinicId!)
      )
    );

  if (!current) return errorResponse("Appointment not found", 404);

  const newDate = date ?? current.date;
  const newStartTime = startTime ?? current.startTime;
  const newEndTime = endTime ?? current.endTime;

  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.dentistId, current.dentistId),
        eq(appointments.date, newDate),
        not(eq(appointments.id, id)),
        not(eq(appointments.status, "cancelled")),
        sql`${appointments.startTime} < ${newEndTime}::time`,
        sql`${appointments.endTime} > ${newStartTime}::time`
      )
    )
    .limit(1);

  if (conflicts.length > 0) {
    return errorResponse("Time slot conflicts with an existing appointment", 409);
  }
}

const updateData: Record<string, unknown> = { ...otherFields, updatedAt: new Date() };
if (date) updateData.date = date;
if (startTime) updateData.startTime = startTime;
if (endTime) updateData.endTime = endTime;

const [updated] = await db
  .update(appointments)
  .set(updateData)
  .where(
    and(
      eq(appointments.id, id),
      eq(appointments.clinicId, user!.clinicId!)
    )
  )
  .returning();
```

- [ ] **Step 3: Verify the API compiles**

```bash
npx next build --no-lint 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/staff/appointments/[id]/route.ts
git commit -m "feat: extend PATCH appointments with reschedule fields and overlap validation"
```

---

### Task 4: Create calendar utility helpers and shared types

**Files:**
- Create: `src/lib/calendar-utils.ts`

- [ ] **Step 1: Create the utility file with types, color maps, and event mapper**

```typescript
import { parseISO, setHours, setMinutes } from "date-fns";

// ── Types ────────────────────────────────────────────────────

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type ColorMode = "status" | "dentist" | "service";

export interface AppointmentResponse {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  paymentStatus: string;
  paymentAmount: string | null;
  paymentProofUrl: string | null;
  createdAt: string;
  dentistId: string | null;
  serviceId: string | null;
  service: { name: string; durationMinutes: number | null; price: string | null; color: string | null } | null;
  dentist: { name: string; specialization: string | null } | null;
  patient: { name: string; email: string | null; phone: string | null } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    status: AppointmentStatus;
    dentistName: string | null;
    serviceName: string | null;
    dentistId: string | null;
    serviceId: string | null;
    serviceColor: string | null;
    paymentStatus: string;
    paymentAmount: string | null;
    patientName: string | null;
    patientEmail: string | null;
    patientPhone: string | null;
    notes: string | null;
    serviceDuration: number | null;
    servicePrice: string | null;
    dentistSpecialization: string | null;
  };
}

// ── Color Maps ───────────────────────────────────────────────

export const STATUS_COLORS: Record<AppointmentStatus, { bg: string; border: string; text: string }> = {
  pending:     { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  confirmed:   { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
  in_progress: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
  completed:   { bg: "#F3F4F6", border: "#9CA3AF", text: "#374151" },
  cancelled:   { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  no_show:     { bg: "#FFEDD5", border: "#F97316", text: "#9A3412" },
};

const DENTIST_PALETTE = [
  { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
  { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
  { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  { bg: "#E0E7FF", border: "#6366F1", text: "#3730A3" },
  { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D" },
  { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  { bg: "#CCFBF1", border: "#14B8A6", text: "#134E4A" },
  { bg: "#F3E8FF", border: "#A855F7", text: "#6B21A8" },
];

// ── Helpers ──────────────────────────────────────────────────

function timeToDate(dateStr: string, timeStr: string): Date {
  const date = parseISO(dateStr);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

export function mapAppointmentToEvent(appt: AppointmentResponse): CalendarEvent {
  return {
    id: appt.id,
    title: `${appt.service?.name ?? "Appointment"} - ${appt.patient?.name ?? "Unknown"}`,
    start: timeToDate(appt.date, appt.startTime),
    end: timeToDate(appt.date, appt.endTime),
    resource: {
      status: appt.status,
      dentistName: appt.dentist?.name ?? null,
      serviceName: appt.service?.name ?? null,
      dentistId: appt.dentistId,
      serviceId: appt.serviceId,
      serviceColor: appt.service?.color ?? null,
      paymentStatus: appt.paymentStatus,
      paymentAmount: appt.paymentAmount,
      patientName: appt.patient?.name ?? null,
      patientEmail: appt.patient?.email ?? null,
      patientPhone: appt.patient?.phone ?? null,
      notes: appt.notes,
      serviceDuration: appt.service?.durationMinutes ?? null,
      servicePrice: appt.service?.price ?? null,
      dentistSpecialization: appt.dentist?.specialization ?? null,
    },
  };
}

export function getEventStyle(
  event: CalendarEvent,
  colorMode: ColorMode,
  dentistColorMap: Map<string, number>
): React.CSSProperties {
  let colors: { bg: string; border: string; text: string };

  switch (colorMode) {
    case "dentist": {
      const idx = dentistColorMap.get(event.resource.dentistId ?? "") ?? 0;
      colors = DENTIST_PALETTE[idx % DENTIST_PALETTE.length];
      break;
    }
    case "service": {
      if (event.resource.serviceColor) {
        colors = { bg: event.resource.serviceColor + "20", border: event.resource.serviceColor, text: "#1F2937" };
      } else {
        colors = STATUS_COLORS[event.resource.status];
      }
      break;
    }
    default:
      colors = STATUS_COLORS[event.resource.status];
  }

  return {
    backgroundColor: colors.bg,
    borderLeft: `3px solid ${colors.border}`,
    color: colors.text,
    borderRadius: "4px",
    padding: "2px 4px",
    fontSize: "12px",
  };
}

export function buildDentistColorMap(events: CalendarEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const event of events) {
    const dId = event.resource.dentistId;
    if (dId && !map.has(dId)) {
      map.set(dId, idx++);
    }
  }
  return map;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/lib/calendar-utils.ts 2>&1 | head -20
```

Note: if `tsc` fails due to project config, verify with `npx next build --no-lint 2>&1 | head -30` after later tasks integrate it.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calendar-utils.ts
git commit -m "feat: add calendar utility helpers, types, and color maps"
```

---

## Chunk 2: Calendar Toolbar and Side Panel Components

### Task 5: Create CalendarToolbar component

**Files:**
- Create: `src/components/staff/calendar-toolbar.tsx`

**Context:** `react-big-calendar` accepts a `components.toolbar` prop. The custom toolbar receives `{ label, onNavigate, onView, view, views }` as props from the calendar. We add a color mode dropdown.

- [ ] **Step 1: Create the toolbar component**

```typescript
"use client";

import { type ToolbarProps, type View, Navigate } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ColorMode, type CalendarEvent } from "@/lib/calendar-utils";

interface CalendarToolbarProps extends ToolbarProps<CalendarEvent> {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  pendingCount: number;
}

const VIEW_LABELS: Record<string, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

export function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
  colorMode,
  onColorModeChange,
  pendingCount,
}: CalendarToolbarProps) {
  const viewNames = Array.isArray(views)
    ? views
    : (Object.keys(views) as View[]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate(Navigate.TODAY)}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate(Navigate.PREVIOUS)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate(Navigate.NEXT)}>
          <ChevronRight className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">{label}</h2>
        {pendingCount > 0 && (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={colorMode} onValueChange={(v) => onColorModeChange(v as ColorMode)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Color by Status</SelectItem>
            <SelectItem value="dentist">Color by Dentist</SelectItem>
            <SelectItem value="service">Color by Service</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border">
          {viewNames.map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              className="rounded-none first:rounded-l-md last:rounded-r-md text-xs h-8"
              onClick={() => onView(v)}
            >
              {VIEW_LABELS[v] ?? v}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/calendar-toolbar.tsx
git commit -m "feat: add custom CalendarToolbar with view switcher and color mode dropdown"
```

---

### Task 6: Create CalendarSidePanel component

**Files:**
- Create: `src/components/staff/calendar-side-panel.tsx`

- [ ] **Step 1: Create the side panel component**

```typescript
"use client";

import { format } from "date-fns";
import { PanelRightClose, PanelRightOpen, CalendarDays, Clock, CheckCircle2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CalendarEvent, STATUS_COLORS, STATUS_LABELS } from "@/lib/calendar-utils";

interface CalendarSidePanelProps {
  todayEvents: CalendarEvent[];
  collapsed: boolean;
  onToggle: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarSidePanel({
  todayEvents,
  collapsed,
  onToggle,
  onEventClick,
}: CalendarSidePanelProps) {
  const sorted = [...todayEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const pendingCount = sorted.filter((e) => e.resource.status === "pending").length;
  const confirmedCount = sorted.filter((e) => e.resource.status === "confirmed").length;
  const revenue = sorted.reduce((sum, e) => {
    return sum + (e.resource.paymentAmount ? parseFloat(e.resource.paymentAmount) : 0);
  }, 0);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-2">
        <Button variant="ghost" size="icon" onClick={onToggle} title="Expand panel">
          <PanelRightOpen className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l bg-background overflow-y-auto">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">Today&apos;s Schedule</h3>
        <Button variant="ghost" size="icon" onClick={onToggle} title="Collapse panel">
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      {/* Appointment List */}
      <div className="p-3 space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No appointments today
          </p>
        ) : (
          sorted.map((event) => {
            const statusColor = STATUS_COLORS[event.resource.status];
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left rounded-lg bg-muted/50 p-2.5 hover:bg-muted transition-colors"
                style={{ borderLeft: `3px solid ${statusColor.border}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {format(event.start, "h:mm a")}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: statusColor.bg,
                      color: statusColor.text,
                    }}
                  >
                    {STATUS_LABELS[event.resource.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium truncate">
                  {event.resource.serviceName ?? "Appointment"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {event.resource.dentistName} &middot; {event.resource.patientName}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Quick Stats */}
      <div className="border-t p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Stats
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-center">
            <CalendarDays className="mx-auto size-4 text-blue-600" />
            <p className="mt-1 text-lg font-bold text-blue-700">{sorted.length}</p>
            <p className="text-[10px] text-blue-600">Total</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-2 text-center">
            <Clock className="mx-auto size-4 text-yellow-600" />
            <p className="mt-1 text-lg font-bold text-yellow-700">{pendingCount}</p>
            <p className="text-[10px] text-yellow-600">Pending</p>
          </div>
          <div className="rounded-lg bg-green-50 p-2 text-center">
            <CheckCircle2 className="mx-auto size-4 text-green-600" />
            <p className="mt-1 text-lg font-bold text-green-700">{confirmedCount}</p>
            <p className="text-[10px] text-green-600">Confirmed</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-center">
            <DollarSign className="mx-auto size-4 text-emerald-600" />
            <p className="mt-1 text-lg font-bold text-emerald-700">
              ₱{revenue.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600">Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/calendar-side-panel.tsx
git commit -m "feat: add CalendarSidePanel with today's schedule and quick stats"
```

---

## Chunk 3: Appointment Detail Modal and Create Appointment Modal

### Task 7: Create AppointmentDetailModal component

**Files:**
- Create: `src/components/staff/appointment-detail-modal.tsx`

**Context:** Uses shadcn `Dialog` component (already exists at `src/components/ui/dialog.tsx`). The `sonner` toast library is already installed for notifications.

- [ ] **Step 1: Create the modal component**

```typescript
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type CalendarEvent, STATUS_COLORS, STATUS_LABELS } from "@/lib/calendar-utils";
import {
  User,
  Mail,
  Phone,
  Stethoscope,
  Clock,
  CreditCard,
  FileText,
} from "lucide-react";

interface AppointmentDetailModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: () => void; // callback to refetch events
}

type StatusAction = {
  label: string;
  status: string;
  variant: "default" | "destructive" | "outline";
};

const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  pending: [
    { label: "Confirm", status: "confirmed", variant: "default" },
    { label: "Cancel", status: "cancelled", variant: "destructive" },
  ],
  confirmed: [
    { label: "Start", status: "in_progress", variant: "default" },
    { label: "Cancel", status: "cancelled", variant: "destructive" },
  ],
  in_progress: [
    { label: "Complete", status: "completed", variant: "default" },
  ],
};

export function AppointmentDetailModal({
  event,
  open,
  onOpenChange,
  onStatusChange,
}: AppointmentDetailModalProps) {
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const { resource } = event;
  const statusColor = STATUS_COLORS[resource.status];
  const actions = STATUS_ACTIONS[resource.status] ?? [];

  async function handleAction(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/appointments/${event!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      toast.success(`Appointment ${newStatus === "cancelled" ? "cancelled" : "updated"}`);
      onOpenChange(false);
      onStatusChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update appointment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resource.serviceName ?? "Appointment"}
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              {STATUS_LABELS[resource.status]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span>
              {format(event.start, "EEEE, MMMM d, yyyy")} &middot;{" "}
              {format(event.start, "h:mm a")} – {format(event.end, "h:mm a")}
            </span>
          </div>

          {/* Patient */}
          {resource.patientName && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span>{resource.patientName}</span>
              </div>
              {resource.patientEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  <span>{resource.patientEmail}</span>
                </div>
              )}
              {resource.patientPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4" />
                  <span>{resource.patientPhone}</span>
                </div>
              )}
            </div>
          )}

          {/* Service & Dentist */}
          <div className="grid grid-cols-2 gap-4">
            {resource.serviceName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</p>
                <p className="text-sm font-medium">{resource.serviceName}</p>
                {resource.serviceDuration && (
                  <p className="text-xs text-muted-foreground">{resource.serviceDuration} min</p>
                )}
                {resource.servicePrice && (
                  <p className="text-xs text-muted-foreground">₱{parseFloat(resource.servicePrice).toLocaleString()}</p>
                )}
              </div>
            )}
            {resource.dentistName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dentist</p>
                <div className="flex items-center gap-1 text-sm">
                  <Stethoscope className="size-3 text-muted-foreground" />
                  <span className="font-medium">{resource.dentistName}</span>
                </div>
                {resource.dentistSpecialization && (
                  <p className="text-xs text-muted-foreground">{resource.dentistSpecialization}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="size-4 text-muted-foreground" />
            <span className="capitalize">{resource.paymentStatus.replace("_", " ")}</span>
            {resource.paymentAmount && (
              <span className="text-muted-foreground">
                — ₱{parseFloat(resource.paymentAmount).toLocaleString()}
              </span>
            )}
          </div>

          {/* Notes */}
          {resource.notes && (
            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <FileText className="size-3" />
                Notes
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{resource.notes}</p>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              {actions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  disabled={loading}
                  onClick={() => handleAction(action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/appointment-detail-modal.tsx
git commit -m "feat: add AppointmentDetailModal with status actions"
```

---

### Task 8: Create CreateAppointmentModal component

**Files:**
- Create: `src/components/staff/create-appointment-modal.tsx`

**Context:** This modal opens when clicking an empty slot. Pre-fills date/time. Uses existing `GET /api/staff/services`, `GET /api/staff/dentists`, `GET /api/staff/patients` endpoints and `POST /api/bookings` to create. Uses `react-hook-form` + `zod` (both already installed).

- [ ] **Step 1: Create the modal component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SlotInfo {
  start: Date;
  end: Date;
}

interface CreateAppointmentModalProps {
  slot: SlotInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

interface DentistOption {
  id: string;
  name: string;
}

interface PatientOption {
  id: string;
  name: string;
  email: string;
}

export function CreateAppointmentModal({
  slot,
  open,
  onOpenChange,
  onCreated,
}: CreateAppointmentModalProps) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [serviceId, setServiceId] = useState("");
  const [dentistId, setDentistId] = useState("");
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [newPatient, setNewPatient] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");

  // Fetch services, dentists, patients on open
  useEffect(() => {
    if (!open) return;

    async function fetchOptions() {
      try {
        const [svcRes, dentRes, patRes] = await Promise.all([
          fetch("/api/staff/services"),
          fetch("/api/staff/dentists"),
          fetch("/api/staff/patients"),
        ]);

        if (svcRes.ok) {
          const data = await svcRes.json();
          setServices(data.map((s: { id: string; name: string; durationMinutes: number; price: string }) => ({
            id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price,
          })));
        }
        if (dentRes.ok) {
          const data = await dentRes.json();
          setDentists(data.map((d: { id: string; name?: string; firstName?: string; lastName?: string }) => ({
            id: d.id, name: d.name ?? `${d.firstName} ${d.lastName}`,
          })));
        }
        if (patRes.ok) {
          const data = await patRes.json();
          setPatients(data.map((p: { id: string; name?: string; firstName?: string; lastName?: string; email: string }) => ({
            id: p.id, name: p.name ?? `${p.firstName} ${p.lastName}`, email: p.email,
          })));
        }
      } catch {
        toast.error("Failed to load options");
      }
    }

    fetchOptions();
  }, [open]);

  function resetForm() {
    setServiceId("");
    setDentistId("");
    setPatientMode("existing");
    setPatientId("");
    setPatientSearch("");
    setNewPatient({ firstName: "", lastName: "", email: "", phone: "" });
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || !serviceId || !dentistId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (patientMode === "existing" && !patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (patientMode === "new" && (!newPatient.firstName || !newPatient.lastName || !newPatient.email)) {
      toast.error("Please fill in patient details");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        serviceId,
        dentistId,
        date: format(slot.start, "yyyy-MM-dd"),
        startTime: format(slot.start, "HH:mm"),
        notes: notes || undefined,
      };

      if (patientMode === "existing") {
        body.patientId = patientId;
      } else {
        body.firstName = newPatient.firstName;
        body.lastName = newPatient.lastName;
        body.email = newPatient.email;
        body.phone = newPatient.phone || undefined;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create appointment");
      }

      toast.success("Appointment created");
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  }

  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.email.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          {slot && (
            <p className="text-sm text-muted-foreground">
              {format(slot.start, "EEEE, MMMM d, yyyy")} at {format(slot.start, "h:mm a")}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service */}
          <div className="space-y-1.5">
            <Label>Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes}min — ₱{parseFloat(s.price).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dentist */}
          <div className="space-y-1.5">
            <Label>Dentist *</Label>
            <Select value={dentistId} onValueChange={setDentistId}>
              <SelectTrigger><SelectValue placeholder="Select dentist" /></SelectTrigger>
              <SelectContent>
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Patient *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={() => setPatientMode(patientMode === "existing" ? "new" : "existing")}
              >
                {patientMode === "existing" ? "New patient" : "Existing patient"}
              </Button>
            </div>

            {patientMode === "existing" ? (
              <>
                <Input
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {filteredPatients.slice(0, 20).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First name *"
                  value={newPatient.firstName}
                  onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                />
                <Input
                  placeholder="Last name *"
                  value={newPatient.lastName}
                  onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                />
                <Input
                  placeholder="Email *"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
                <Input
                  placeholder="Phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/create-appointment-modal.tsx
git commit -m "feat: add CreateAppointmentModal for slot-click creation"
```

---

## Chunk 4: Main BookingCalendar Component and Staff Page

### Task 9: Create BookingCalendar component

**Files:**
- Create: `src/components/staff/booking-calendar.tsx`

**Context:** This is the main calendar wrapper. Uses `react-big-calendar` with `dateFnsLocalizer` and `withDragAndDrop`. Imports CSS files. Handles all calendar interactions and delegates to modals.

- [ ] **Step 1: Create the booking calendar component**

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addDays, subDays } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { toast } from "sonner";

import { CalendarToolbar } from "@/components/staff/calendar-toolbar";
import {
  type CalendarEvent,
  type ColorMode,
  getEventStyle,
  buildDentistColorMap,
  mapAppointmentToEvent,
  type AppointmentResponse,
} from "@/lib/calendar-utils";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface BookingCalendarProps {
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (slot: SlotInfo) => void;
  onEventsChange: (events: CalendarEvent[]) => void;
  events: CalendarEvent[];
  loading: boolean;
  onRangeChange: (range: { start: Date; end: Date }) => void;
}

export function BookingCalendar({
  onEventClick,
  onSlotClick,
  onEventsChange,
  events,
  loading,
  onRangeChange,
}: BookingCalendarProps) {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [colorMode, setColorMode] = useState<ColorMode>("status");

  const dentistColorMap = useMemo(() => buildDentistColorMap(events), [events]);
  const pendingCount = useMemo(
    () => events.filter((e) => e.resource.status === "pending").length,
    [events]
  );

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        // Week/Day view returns array of dates
        onRangeChange({
          start: range[0],
          end: range[range.length - 1],
        });
      } else {
        // Month view returns { start, end }
        onRangeChange(range);
      }
    },
    [onRangeChange]
  );

  const handleNavigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);
    },
    []
  );

  const handleEventDrop = useCallback(
    async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      const status = event.resource.status;
      if (status !== "pending" && status !== "confirmed") {
        toast.error("Only pending and confirmed appointments can be rescheduled");
        return;
      }

      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);

      const confirmed = window.confirm(
        `Move "${event.resource.serviceName}" for ${event.resource.patientName} to ${format(startDate, "MMM d")} at ${format(startDate, "h:mm a")}?`
      );

      if (!confirmed) return;

      try {
        const res = await fetch(`/api/staff/appointments/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: format(startDate, "yyyy-MM-dd"),
            startTime: format(startDate, "HH:mm"),
            endTime: format(endDate, "HH:mm"),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to reschedule");
        }

        toast.success("Appointment rescheduled");

        // Optimistic update
        const updated = events.map((e) =>
          e.id === event.id ? { ...e, start: startDate, end: endDate } : e
        );
        onEventsChange(updated);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to reschedule");
      }
    },
    [events, onEventsChange]
  );

  const handleEventResize = handleEventDrop;

  const eventPropGetter = useCallback(
    (event: CalendarEvent) => ({
      style: getEventStyle(event, colorMode, dentistColorMap),
    }),
    [colorMode, dentistColorMap]
  );

  const draggableAccessor = useCallback(
    (event: CalendarEvent) =>
      event.resource.status === "pending" || event.resource.status === "confirmed",
    []
  );

  const components = useMemo(
    () => ({
      toolbar: (props: React.ComponentProps<typeof CalendarToolbar>) => (
        <CalendarToolbar
          {...props}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          pendingCount={pendingCount}
        />
      ),
    }),
    [colorMode, pendingCount]
  );

  return (
    <div className="flex-1 min-h-0">
      <DnDCalendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={setView}
        onNavigate={handleNavigate}
        onRangeChange={handleRangeChange}
        onSelectEvent={onEventClick}
        onSelectSlot={onSlotClick}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        eventPropGetter={eventPropGetter}
        draggableAccessor={draggableAccessor}
        selectable
        resizable
        popup
        views={["month", "week", "day"]}
        step={30}
        timeslots={2}
        min={new Date(0, 0, 0, 7, 0)}
        max={new Date(0, 0, 0, 20, 0)}
        components={components}
        style={{ height: "calc(100vh - 120px)" }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/booking-calendar.tsx
git commit -m "feat: add BookingCalendar with react-big-calendar, DnD, and color modes"
```

---

### Task 10: Rewrite staff landing page

**Files:**
- Rewrite: `src/app/staff/page.tsx`

**Context:** Replace the entire content of the current staff dashboard with the new calendar layout. The page fetches appointments from the API and composes the BookingCalendar, CalendarSidePanel, AppointmentDetailModal, and CreateAppointmentModal.

- [ ] **Step 1: Rewrite the staff page**

```typescript
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday } from "date-fns";
import { toast } from "sonner";
import { type SlotInfo } from "react-big-calendar";

import { BookingCalendar } from "@/components/staff/booking-calendar";
import { CalendarSidePanel } from "@/components/staff/calendar-side-panel";
import { AppointmentDetailModal } from "@/components/staff/appointment-detail-modal";
import { CreateAppointmentModal } from "@/components/staff/create-appointment-modal";
import {
  type CalendarEvent,
  type AppointmentResponse,
  mapAppointmentToEvent,
} from "@/lib/calendar-utils";

export default function StaffDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);

  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Current date range for fetching
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: startOfWeek(startOfMonth(now)),
      end: endOfWeek(endOfMonth(now)),
    };
  });

  // Fetch appointments for the visible range
  const fetchAppointments = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(end, "yyyy-MM-dd"),
      });

      const res = await fetch(`/api/staff/appointments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");

      const data: AppointmentResponse[] = await res.json();
      const mapped = data.map(mapAppointmentToEvent);
      setEvents(mapped);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAppointments(dateRange.start, dateRange.end);
  }, [dateRange, fetchAppointments]);

  const handleRangeChange = useCallback((range: { start: Date; end: Date }) => {
    setDateRange(range);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  }, []);

  const handleSlotClick = useCallback((slot: SlotInfo) => {
    setSelectedSlot(slot);
    setCreateModalOpen(true);
  }, []);

  const handleRefetch = useCallback(() => {
    fetchAppointments(dateRange.start, dateRange.end);
  }, [dateRange, fetchAppointments]);

  // Today's events for side panel
  const todayEvents = useMemo(
    () => events.filter((e) => isToday(e.start)),
    [events]
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Calendar */}
      <BookingCalendar
        events={events}
        loading={loading}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
        onEventsChange={setEvents}
        onRangeChange={handleRangeChange}
      />

      {/* Side Panel */}
      <CalendarSidePanel
        todayEvents={todayEvents}
        collapsed={sidePanelCollapsed}
        onToggle={() => setSidePanelCollapsed(!sidePanelCollapsed)}
        onEventClick={handleEventClick}
      />

      {/* Modals */}
      <AppointmentDetailModal
        event={selectedEvent}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onStatusChange={handleRefetch}
      />

      <CreateAppointmentModal
        slot={selectedSlot}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleRefetch}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/staff/page.tsx
git commit -m "feat: rewrite staff page with calendar dashboard layout"
```

---

### Task 11: Remove old calendar files

**Files:**
- Delete: `src/components/staff/calendar-day-view.tsx`
- Delete: `src/components/staff/calendar-week-view.tsx`
- Delete: `src/app/staff/calendar/page.tsx`

- [ ] **Step 1: Check if any other files import these components**

```bash
grep -r "calendar-day-view\|calendar-week-view\|CalendarDayView\|CalendarWeekView" src/ --include="*.tsx" --include="*.ts" -l
```

Expected: only the files being deleted and possibly the old `staff/calendar/page.tsx`. If other files import them, update those imports first.

- [ ] **Step 2: Delete the files**

```bash
rm src/components/staff/calendar-day-view.tsx
rm src/components/staff/calendar-week-view.tsx
rm src/app/staff/calendar/page.tsx
```

- [ ] **Step 3: Verify no broken imports**

```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: build succeeds (or at least no errors related to deleted files).

- [ ] **Step 4: Commit**

```bash
git add -u src/components/staff/calendar-day-view.tsx src/components/staff/calendar-week-view.tsx src/app/staff/calendar/page.tsx
git commit -m "chore: remove old calendar components replaced by react-big-calendar"
```

---

### Task 12: Add custom CSS overrides for react-big-calendar

**Files:**
- Create: `src/styles/calendar-overrides.css`
- Modify: `src/components/staff/booking-calendar.tsx` (add import)

**Context:** The default react-big-calendar styles may clash with the app's Tailwind design. Add a small CSS file that tunes fonts, borders, and header backgrounds to match shadcn/ui aesthetics.

- [ ] **Step 1: Create the CSS overrides file**

```css
/* Override react-big-calendar defaults to match shadcn/ui design system */

.rbc-calendar {
  font-family: inherit;
}

.rbc-header {
  padding: 8px 4px;
  font-weight: 600;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
}

.rbc-today {
  background-color: hsl(var(--accent) / 0.3);
}

.rbc-off-range-bg {
  background-color: hsl(var(--muted) / 0.3);
}

.rbc-event {
  border: none;
  padding: 2px 4px;
  font-size: 12px;
  border-radius: 4px;
}

.rbc-event:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 1px;
}

.rbc-event-label {
  font-size: 10px;
}

.rbc-show-more {
  font-size: 11px;
  color: hsl(var(--primary));
  font-weight: 500;
}

.rbc-time-header-cell {
  min-height: 40px;
}

.rbc-time-slot {
  border-top: 1px solid hsl(var(--border) / 0.5);
}

.rbc-timeslot-group {
  border-bottom: 1px solid hsl(var(--border));
}

.rbc-time-content {
  border-top: 1px solid hsl(var(--border));
}

.rbc-time-view {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}

.rbc-month-view {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}

.rbc-day-bg + .rbc-day-bg,
.rbc-month-row + .rbc-month-row {
  border-color: hsl(var(--border));
}

.rbc-time-header-content {
  border-left: 1px solid hsl(var(--border));
}

.rbc-time-content > * + * > * {
  border-left: 1px solid hsl(var(--border));
}

.rbc-current-time-indicator {
  background-color: hsl(var(--destructive));
  height: 2px;
}

.rbc-addons-dnd .rbc-addons-dnd-resize-ns-icon,
.rbc-addons-dnd .rbc-addons-dnd-resize-ew-icon {
  display: none;
}

.rbc-addons-dnd-dragged-event {
  opacity: 0.5;
}
```

- [ ] **Step 2: Import in BookingCalendar**

Add this import to `src/components/staff/booking-calendar.tsx` after the other CSS imports:

```typescript
import "@/styles/calendar-overrides.css";
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/calendar-overrides.css src/components/staff/booking-calendar.tsx
git commit -m "style: add calendar CSS overrides to match shadcn/ui design"
```

---

### Task 13: Verify full build and smoke test

- [ ] **Step 1: Run the build**

```bash
npx next build --no-lint 2>&1 | tail -30
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:3000/staff` (or the appropriate subdomain). Verify:
1. Calendar renders with Month/Week/Day views
2. View switcher works
3. Side panel shows and collapses
4. Color mode dropdown switches between status/dentist/service
5. Clicking an event opens the detail modal
6. Clicking an empty slot opens the create modal
7. Dragging an event shows confirmation dialog

- [ ] **Step 3: Fix any issues found during smoke test**

Address TypeScript errors, styling issues, or runtime errors.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
