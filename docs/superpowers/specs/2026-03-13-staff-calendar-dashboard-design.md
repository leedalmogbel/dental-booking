# Staff Calendar Dashboard — Design Spec

## Overview

Replace the current staff dashboard with a `react-big-calendar`-based calendar view that displays all bookings. This becomes the main landing page for staff/admin/dentist users after login.

**Layout:** Calendar + collapsible side panel (today's schedule + quick stats).

## Requirements

1. **react-big-calendar** with Month, Week, and Day views (like Google Calendar)
2. Calendar is the **main staff landing page** (`/staff`)
3. **Layout C** — calendar on the left, collapsible side panel on the right with today's appointments list and quick stats
4. **Click event** → modal with full appointment details + actions (confirm, cancel, complete, etc.)
5. **Click empty slot** → modal to create a new appointment (pre-filled date/time)
6. **Drag-and-drop** → reschedule appointments (with confirmation dialog)
7. **Filterable color coding** — default by status, switchable to by-dentist or by-service via toolbar dropdown
8. **No real-time notifications** — lightweight badge/count for pending appointments is sufficient

## Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `BookingCalendar` | `src/components/staff/booking-calendar.tsx` | Main react-big-calendar wrapper with Month/Week/Day views, event rendering, drag-and-drop. Uses `withDragAndDrop` addon from `react-big-calendar/lib/addons/dragAndDrop`. |
| `CalendarSidePanel` | `src/components/staff/calendar-side-panel.tsx` | Right side panel — today's schedule list + quick stats, collapsible |
| `AppointmentDetailModal` | `src/components/staff/appointment-detail-modal.tsx` | Modal for viewing appointment details + status actions |
| `CalendarToolbar` | `src/components/staff/calendar-toolbar.tsx` | Custom toolbar with navigation, view switcher, color mode dropdown |
| `CreateAppointmentModal` | `src/components/staff/create-appointment-modal.tsx` | Modal for creating appointment from empty slot click |

### Modified Files

| File | Change |
|------|--------|
| `src/app/staff/page.tsx` | Replace current dashboard with Calendar + Side Panel layout |
| `src/app/api/staff/appointments/route.ts` | Add `dentistId`, `serviceId`, and `serviceColor` to GET response |
| `src/app/api/staff/appointments/[id]/route.ts` | Extend existing PATCH schema to accept `date`, `startTime`, `endTime` fields for drag-and-drop reschedule |

### Files to Remove

| File | Reason |
|------|--------|
| `src/components/staff/calendar-day-view.tsx` | Replaced by react-big-calendar Day view |
| `src/components/staff/calendar-week-view.tsx` | Replaced by react-big-calendar Week view |
| `src/app/staff/calendar/page.tsx` | Replaced — `/staff` is now the calendar. Remove page to avoid broken imports. |

### Dependencies

| Package | Purpose |
|---------|---------|
| `react-big-calendar` | Calendar component with Month/Week/Day views + drag-and-drop |
| `@types/react-big-calendar` | TypeScript types |
| `date-fns` | Already installed — used as the localizer for react-big-calendar |

### CSS Setup

Import `react-big-calendar/lib/css/react-big-calendar.css` and `react-big-calendar/lib/addons/dragAndDrop/styles.css` in the BookingCalendar component or in a global layout. Override default styles with Tailwind-compatible CSS to match the app's design system.

## Data Flow

1. Staff page loads → fetches appointments for current visible date range via `GET /api/staff/appointments?dateFrom=X&dateTo=Y`
2. `react-big-calendar` `onRangeChange` callback triggers re-fetch when user navigates between months/weeks/days
3. API response mapped to calendar event format:
   ```
   {
     id: string,
     title: "Service Name - Patient Name",
     start: Date,       // constructed from date + startTime
     end: Date,         // constructed from date + endTime
     resource: {
       status, dentistName, serviceName, dentistId, serviceId,
       serviceColor, paymentStatus, patientEmail, patientPhone, notes
     }
   }
   ```
4. Click event → opens AppointmentDetailModal
5. Click empty slot → opens CreateAppointmentModal with pre-filled date/time
6. Drag event → confirmation dialog → `PATCH /api/staff/appointments/[id]` with new date/startTime/endTime

**Loading states:** Show skeleton/spinner while fetching appointments. Calendar renders empty grid during load.

**Error states:** Toast notification on API failure. Calendar retains last successfully fetched events.

**Empty states:** Calendar renders normally with no events. Side panel shows "No appointments today" message.

## Color Coding

Switchable via dropdown in the custom toolbar. Current mode stored in component state.

| Mode | Default | Logic |
|------|---------|-------|
| **By Status** | Yes | `pending` = yellow, `confirmed` = blue, `in_progress` = green, `completed` = gray, `cancelled` = red, `no_show` = orange |
| **By Dentist** | No | Auto-assign from palette of 8 distinct colors keyed by dentist ID |
| **By Service** | No | Use `serviceColor` from API response (from services.color column), fallback to auto-palette |

Implementation: Custom `eventPropGetter` reads current color mode and returns appropriate `style` object with `backgroundColor` and `borderColor`.

## Side Panel

**Position:** Right side of the calendar, collapsible via toggle button.

**Sections:**

1. **Today's Schedule** — ordered list of today's appointments:
   - Time (e.g., "9:00 AM")
   - Service name
   - Dentist name
   - Patient name
   - Status badge (colored)
   - Clicking an item opens the AppointmentDetailModal

2. **Quick Stats** — computed client-side from fetched today's appointments:
   - Today's appointment count
   - Pending count
   - Confirmed count
   - Today's revenue (sum of `paymentAmount` from today's appointments)

**Collapsed state:** Calendar takes full width. Small toggle button remains visible on the right edge.

## Appointment Detail Modal

**Display fields:**
- Patient: name, email, phone
- Service: name, duration, price
- Dentist: name, specialization
- Date and time
- Status (with colored badge)
- Payment status
- Notes

**Actions** (contextual based on current status):
- `pending` → Confirm, Cancel
- `confirmed` → Start (→ in_progress), Cancel
- `in_progress` → Complete
- `completed` → (no actions, read-only)
- `cancelled` → (no actions, read-only)
- `no_show` → (no actions, read-only)

**API:** Uses existing `PATCH /api/staff/appointments/[id]` endpoint.

On action → refetch calendar events to reflect the change.

## Create Appointment Modal

**Trigger:** Click on an empty time slot in the calendar.

**Pre-filled:** Date and time from clicked slot.

**Form fields:**
- Patient — search existing patients by name/email, or enter new patient details
- Service — dropdown of active clinic services
- Dentist — dropdown of active dentists (filtered by service if applicable)
- Notes — optional text area

**API:** Uses existing `POST /api/bookings` endpoint (staff-initiated booking).

On success → refetch calendar events + close modal.

## Drag-and-Drop Reschedule

Uses `withDragAndDrop` HOC from `react-big-calendar/lib/addons/dragAndDrop`.

**Handlers:** `onEventDrop` (move to new slot) and `onEventResize` (change duration).

**Flow:**
1. User drags appointment to new time/date
2. Confirmation dialog: "Move [Service] for [Patient] to [new date] at [new time]?"
3. On confirm → `PATCH /api/staff/appointments/[id]` with updated `date`, `startTime`, `endTime`
4. Server validates no time overlap with same dentist's other appointments (reuses existing double-booking prevention logic from booking engine)
5. On success → events refetch
6. On cancel/error → event snaps back to original position

**Restrictions:**
- Only `pending` and `confirmed` appointments can be dragged
- `completed`, `cancelled`, `no_show`, `in_progress` appointments are not draggable (enforced via `draggableAccessor` prop)

## API Changes

### PATCH /api/staff/appointments/[id] (extend existing)

**File:** `src/app/api/staff/appointments/[id]/route.ts` (already exists)

**Extend Zod schema** to add:
```
date: z.string().optional(),        // "YYYY-MM-DD"
startTime: z.string().optional(),   // "HH:mm"
endTime: z.string().optional(),     // "HH:mm"
```

When `date`, `startTime`, or `endTime` are provided, validate no overlap with same dentist's existing appointments before updating.

All other existing fields (`status`, `paymentStatus`, `cancellationReason`, `notes`) remain unchanged.

### GET /api/staff/appointments (extend response)

**File:** `src/app/api/staff/appointments/route.ts` (already exists)

**Add to response mapping:**
- `dentistId` — raw dentist ID for color-coding by dentist
- `serviceId` — raw service ID for color-coding by service
- `serviceColor` — from `services.color` column for by-service color mode
