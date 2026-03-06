# Dental Booking Platform — Design Document

## Overview

A multi-tenant, white-label dental booking SaaS platform. Clinics get their own branded subdomain with appointment booking, staff portal, QR-based payments, and patient management. Platform owner profits through hybrid monetization: subscription tiers + transaction visibility.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monetization | Hybrid (subscription + commission visibility) | Predictable recurring revenue + growth upside |
| Target scale | 5-20 clinics (MVP) | Ship fast, iterate with real feedback |
| Multi-tenancy | Shared DB + tenant column (RLS) | Simplest, cheapest for single VPS |
| Hosting | Docker Compose on Hostinger VPS | Cost-effective, full control |
| Tech stack | Next.js + Drizzle ORM + PostgreSQL | Full-stack JS, type-safe ORM |
| Payments | QR-based (GCash/Maya) + manual staff confirmation | No gateway fees, practical for PH market |
| Notifications | Gmail SMTP via Nodemailer | Free, no API dependency |
| Database abstraction | Drizzle ORM (swap DB via connection string) | Can move to Supabase later without code changes |
| Payment abstraction | PaymentProvider interface | Can add PayMongo/Stripe later |
| AI features | Skipped for MVP | Add in future phase |
| SMS/Messenger | Deferred to future phase | Email + web push (future) for now |
| UI library | shadcn/ui + Tailwind CSS | Customizable, great for white-labeling |

---

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Hostinger VPS                       │
│  ┌────────────────────────────────────────────────┐  │
│  │             Docker Compose                      │  │
│  │                                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │  Nginx   │  │ Next.js  │  │ PostgreSQL  │  │  │
│  │  │ (proxy)  │──│  App     │──│   16        │  │  │
│  │  │ SSL/TLS  │  │ Port 3000│  │ Port 5432   │  │  │
│  │  └──────────┘  └──────────┘  └─────────────┘  │  │
│  │       │                                         │  │
│  │  ┌──────────┐  ┌──────────┐                    │  │
│  │  │  Redis   │  │  Worker  │ (BullMQ)           │  │
│  │  │ Port 6379│  │ (cron)   │                    │  │
│  │  └──────────┘  └──────────┘                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  External Services:                                   │
│  - Gmail SMTP (email notifications via Nodemailer)    │
│  - Cloudinary or local storage (file uploads)         │
└───────────────────────────────────────────────────────┘
```

### Multi-Tenant Routing

- Wildcard subdomain: `*.dentalbook.ph` → Nginx → Next.js
- Middleware extracts clinic slug from subdomain
- Loads clinic branding (logo, colors, name) from DB
- Patient booking: `smileclinic.dentalbook.ph`
- Staff portal: `smileclinic.dentalbook.ph/staff`
- Super admin: `admin.dentalbook.ph`

---

## Database Schema

All tables include `clinic_id` for tenant isolation via PostgreSQL Row-Level Security (RLS).

### clinics
```
id                  UUID PRIMARY KEY
name                VARCHAR(255)
slug                VARCHAR(100) UNIQUE  -- subdomain identifier
logo_url            TEXT
primary_color       VARCHAR(7)           -- hex color e.g. #2563EB
secondary_color     VARCHAR(7)
address             TEXT
phone               VARCHAR(20)
email               VARCHAR(255)
timezone            VARCHAR(50)          -- e.g. Asia/Manila
operating_hours     JSONB                -- {mon: {start: "09:00", end: "17:00"}, ...}
qr_code_url         TEXT                 -- GCash/Maya QR image
subscription_tier   ENUM(starter, professional, enterprise)
subscription_status ENUM(active, past_due, cancelled, trial)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### users
```
id                  UUID PRIMARY KEY
clinic_id           UUID REFERENCES clinics
email               VARCHAR(255)
password_hash       TEXT
phone               VARCHAR(20)
first_name          VARCHAR(100)
last_name           VARCHAR(100)
role                ENUM(patient, clinic_admin, dentist, super_admin)
avatar_url          TEXT
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMP
updated_at          TIMESTAMP

UNIQUE(email, clinic_id)
```

### dentists
```
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users
clinic_id           UUID REFERENCES clinics
specialization      VARCHAR(100)
bio                 TEXT
photo_url           TEXT
working_hours       JSONB    -- {mon: {start: "09:00", end: "17:00", break_start: "12:00", break_end: "13:00"}}
working_days        JSONB    -- ["mon","tue","wed","thu","fri"]
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### services
```
id                      UUID PRIMARY KEY
clinic_id               UUID REFERENCES clinics
name                    VARCHAR(255)
description             TEXT
duration_minutes        INTEGER
price                   DECIMAL(10,2)
required_specialization VARCHAR(100)  -- nullable
pre_instructions        TEXT
is_active               BOOLEAN DEFAULT true
sort_order              INTEGER DEFAULT 0
color                   VARCHAR(7)    -- for calendar display
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### dentist_services (many-to-many)
```
dentist_id    UUID REFERENCES dentists
service_id    UUID REFERENCES services
PRIMARY KEY (dentist_id, service_id)
```

### appointments
```
id                  UUID PRIMARY KEY
clinic_id           UUID REFERENCES clinics
patient_id          UUID REFERENCES users
dentist_id          UUID REFERENCES dentists
service_id          UUID REFERENCES services
date                DATE
start_time          TIME
end_time            TIME
status              ENUM(pending, confirmed, in_progress, completed, cancelled, no_show)
notes               TEXT
cancellation_reason TEXT
payment_status      ENUM(unpaid, proof_submitted, confirmed, refunded)
payment_proof_url   TEXT
payment_amount      DECIMAL(10,2)
created_at          TIMESTAMP
updated_at          TIMESTAMP

-- Prevent double booking
EXCLUDE USING gist (
  dentist_id WITH =,
  date WITH =,
  tsrange(start_time, end_time) WITH &&
) WHERE (status NOT IN ('cancelled'))
```

### treatment_records
```
id              UUID PRIMARY KEY
appointment_id  UUID REFERENCES appointments
dentist_id      UUID REFERENCES dentists
patient_id      UUID REFERENCES users
clinic_id       UUID REFERENCES clinics
diagnosis       TEXT
procedures_done TEXT
notes           TEXT
attachments     JSONB    -- [{url, type, name}]
created_at      TIMESTAMP
```

### patient_profiles
```
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES users
clinic_id               UUID REFERENCES clinics
date_of_birth           DATE
gender                  VARCHAR(10)
address                 TEXT
medical_history         JSONB
allergies               JSONB
dental_concerns         TEXT
emergency_contact_name  VARCHAR(255)
emergency_contact_phone VARCHAR(20)
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### notifications
```
id              UUID PRIMARY KEY
clinic_id       UUID REFERENCES clinics
user_id         UUID REFERENCES users
type            VARCHAR(50)   -- appointment_reminder, booking_confirmed, payment_confirmed, etc.
channel         VARCHAR(20)   -- email (future: sms, messenger, push)
status          ENUM(pending, sent, failed)
scheduled_at    TIMESTAMP
sent_at         TIMESTAMP
content         JSONB         -- {subject, body, template_data}
created_at      TIMESTAMP
```

### waitlist
```
id                   UUID PRIMARY KEY
clinic_id            UUID REFERENCES clinics
patient_id           UUID REFERENCES users
service_id           UUID REFERENCES services
preferred_dentist_id UUID REFERENCES dentists  -- nullable
preferred_date       DATE
preferred_time_range JSONB   -- {start: "09:00", end: "12:00"}
status               ENUM(waiting, notified, booked, expired)
created_at           TIMESTAMP
```

### subscriptions
```
id                    UUID PRIMARY KEY
clinic_id             UUID REFERENCES clinics
tier                  ENUM(starter, professional, enterprise)
status                ENUM(active, past_due, cancelled, trial)
current_period_start  DATE
current_period_end    DATE
amount                DECIMAL(10,2)
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register           Patient registration
POST   /api/auth/login              Login (JWT)
POST   /api/auth/refresh            Refresh token
POST   /api/auth/forgot-password    Password reset
GET    /api/auth/me                 Current user profile
```

### Clinic (Public)
```
GET    /api/clinics/:slug           Clinic info + branding
GET    /api/clinics/:slug/services  Available services
GET    /api/clinics/:slug/dentists  Available dentists
```

### Booking Engine
```
GET    /api/bookings/slots          Available time slots (?clinicId, serviceId, dentistId, date)
POST   /api/bookings                Create appointment
PATCH  /api/bookings/:id            Reschedule / cancel
GET    /api/bookings/:id            Appointment details
POST   /api/bookings/:id/payment-proof   Upload payment screenshot
```

### Patient Dashboard
```
GET    /api/patient/appointments        My appointments
GET    /api/patient/treatment-history   Treatment records
PUT    /api/patient/profile             Update profile + medical history
POST   /api/patient/documents           Upload dental records
```

### Staff Portal
```
GET    /api/staff/appointments          All clinic appointments (filterable)
PATCH  /api/staff/appointments/:id      Update status, confirm payment
GET    /api/staff/dashboard             Stats (today's bookings, revenue, pending)
GET    /api/staff/calendar              Calendar view data

POST   /api/staff/dentists              Add dentist
PUT    /api/staff/dentists/:id          Update dentist
DELETE /api/staff/dentists/:id          Deactivate dentist

POST   /api/staff/services              Add service
PUT    /api/staff/services/:id          Update service
DELETE /api/staff/services/:id          Deactivate service

PUT    /api/staff/clinic/settings       Update clinic settings / branding
POST   /api/staff/clinic/qr-code       Upload payment QR code

GET    /api/staff/patients              Patient list
GET    /api/staff/patients/:id          Patient details + history
POST   /api/staff/treatment-records     Log treatment record

GET    /api/staff/reports               Analytics / reports
GET    /api/staff/waitlist              Waitlist management
```

### Super Admin
```
GET    /api/admin/clinics               All clinics
POST   /api/admin/clinics               Create clinic
PATCH  /api/admin/clinics/:id           Activate / deactivate
GET    /api/admin/analytics             Platform-wide analytics
GET    /api/admin/subscriptions         Subscription management
```

---

## Booking Engine Logic

### Time Slot Generation Algorithm

```
generateAvailableSlots(clinicId, serviceId, dentistId?, date):

  1. Get clinic operating hours for the given day of week
     - If clinic is closed that day → return empty
  2. Get eligible dentist(s):
     - If dentistId provided → that dentist only
     - Else → all active dentists linked to this service via dentist_services
  3. Get service duration (e.g. 30 minutes)
  4. For each eligible dentist:
     a. Check dentist works that day (working_days)
     b. Get dentist working hours for that day
     c. Generate time slots at interval = service duration
        Start: max(clinic_open, dentist_start)
        End: min(clinic_close, dentist_end) - service_duration
     d. Remove slots overlapping dentist break time
     e. Fetch existing appointments for that dentist on that date
     f. Remove slots that overlap with any existing appointment
     g. Remove manually blocked time slots
  5. Return: { dentistId, dentistName, availableSlots: ["09:00", "09:30", ...] }[]
  6. Include suggestion: earliest available slot across all dentists
```

### Double-Booking Prevention

1. **Database level:** PostgreSQL exclusion constraint prevents overlapping appointments per dentist
2. **Application level:** Within a transaction:
   - Re-check slot availability
   - Insert appointment
   - If constraint violation → return error + suggest next slot
3. **Optimistic UX:** Show slots as available, verify on submit

---

## Frontend UI Structure

```
app/
├── (public)/                          # Patient-facing (branded per clinic)
│   ├── page.tsx                       # Clinic landing / start booking
│   ├── book/
│   │   ├── page.tsx                   # Step 1: Select service
│   │   ├── dentist/page.tsx           # Step 2: Select dentist (optional)
│   │   ├── schedule/page.tsx          # Step 3: Select date + time
│   │   ├── details/page.tsx           # Step 4: Patient details
│   │   ├── payment/page.tsx           # Step 5: QR code + upload proof
│   │   └── confirmation/page.tsx      # Step 6: Confirmed
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── dashboard/
│       ├── page.tsx                   # Upcoming appointments
│       ├── history/page.tsx           # Treatment history
│       ├── profile/page.tsx           # Medical profile
│       └── appointments/[id]/page.tsx # Detail + reschedule
│
├── staff/                             # Staff portal
│   ├── page.tsx                       # Dashboard overview
│   ├── appointments/
│   │   ├── page.tsx                   # List + calendar
│   │   └── [id]/page.tsx             # Detail + confirm payment
│   ├── calendar/page.tsx              # Full calendar views
│   ├── patients/
│   │   ├── page.tsx                   # Patient list
│   │   └── [id]/page.tsx             # Patient profile + history
│   ├── dentists/
│   │   ├── page.tsx                   # Dentist management
│   │   └── [id]/page.tsx             # Dentist schedule config
│   ├── services/page.tsx
│   ├── payments/page.tsx              # Payment tracking
│   ├── waitlist/page.tsx
│   ├── reports/page.tsx               # Analytics
│   └── settings/
│       ├── page.tsx                   # General settings
│       ├── branding/page.tsx          # Logo, colors
│       ├── schedule/page.tsx          # Operating hours
│       └── notifications/page.tsx     # Email templates
│
├── admin/                             # Super admin
│   ├── page.tsx                       # Platform overview
│   ├── clinics/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── subscriptions/page.tsx
│   └── analytics/page.tsx
│
└── api/                               # API routes
```

### Key Components
- `BookingWizard` — Multi-step booking flow
- `TimeSlotPicker` — Date picker + available slots grid
- `CalendarView` — Daily/weekly/dentist calendar, color-coded by service
- `PaymentProofUpload` — QR display + image upload
- `AppointmentCard` — Reusable appointment display with status + actions
- `StaffDashboardStats` — Today's bookings, revenue, pending payments
- `ClinicBrandingWrapper` — Applies clinic colors/logo via CSS variables

---

## Deployment

### Docker Compose (Hostinger VPS)

Services:
- **nginx** — Reverse proxy, SSL via Let's Encrypt (Certbot), wildcard subdomain routing
- **app** — Next.js production build (`next start`)
- **postgres** — PostgreSQL 16 with persistent volume
- **redis** — Redis 7 for sessions + BullMQ job queue
- **worker** — BullMQ worker process for scheduled emails/notifications

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://dental:password@postgres:5432/dentalbook

# Redis
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET=<generate-random-64-char>
NEXTAUTH_SECRET=<generate-random-64-char>
NEXT_PUBLIC_APP_URL=https://dentalbook.ph

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password

# File uploads
UPLOAD_PROVIDER=local
UPLOAD_DIR=/app/uploads
```

### Deployment Flow
```
1. Local development → Push to GitHub
2. SSH to VPS → git pull
3. docker compose up -d --build
4. Migrations: docker compose exec app npx drizzle-kit push
```

---

## Monetization Strategy

### Subscription Tiers

| Tier | Monthly (PHP) | Features |
|------|--------------|----------|
| Starter | 1,500 | 1 dentist, basic booking, email notifications |
| Professional | 3,500 | 5 dentists, analytics, waitlist, treatment records |
| Enterprise | 7,000 | Unlimited dentists, custom branding, priority support |

### Revenue Projections (MVP: 10 clinics)

| Scenario | Monthly Revenue |
|----------|----------------|
| 10 Starter clinics | PHP 15,000 |
| 5 Starter + 5 Professional | PHP 25,000 |
| 3 Starter + 5 Pro + 2 Enterprise | PHP 36,000 |

### Cost Structure
- Hostinger VPS: ~PHP 500-1,500/mo
- Domain: ~PHP 500/year
- Gmail SMTP: Free
- Your time: Priceless

### Future Revenue Streams
- SMS/Messenger notifications (charge per message)
- AI features (premium tier add-on)
- Online payment processing (transaction fees via PayMongo/Stripe)
- Custom domain setup fee
- Data export / migration fee
- White-label reseller program

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Server Actions |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | JWT (jose library) + bcrypt |
| Email | Nodemailer + Gmail SMTP |
| File upload | Local storage (future: Cloudinary) |
| Deployment | Docker Compose + Nginx |
| Hosting | Hostinger VPS |

---

## Future Phase Features (Not in MVP)

- Facebook Messenger notifications
- SMS notifications (Semaphore)
- Web push notifications
- AI schedule optimization (Claude API)
- AI patient chat assistant
- PayMongo / Stripe online payments
- Tele-dentistry video calls
- Insurance processing
- Mobile app (React Native)
- Multi-branch clinic support
- Marketing tools (promotions, loyalty, SMS campaigns)
- Digital intake forms
