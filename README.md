# DentalBook — Multi-Tenant Dental Booking Platform

A white-label SaaS dental booking platform that clinics can use daily. Each clinic gets a branded subdomain with patient booking, staff portal, and admin dashboard.

## Quick Start

```bash
# 1. Start database and Redis
docker compose up -d

# 2. Install dependencies
npm install

# 3. Push schema to database
npx drizzle-kit push

# 4. Seed demo data
npm run db:seed

# 5. Start dev server
npm run dev
```

Open http://localhost:3000?clinic=smile-dental

## Demo Logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@dentalbook.ph | password123 |
| Clinic Admin | admin@smileclinic.ph | password123 |
| Dentist | dr.cruz@smileclinic.ph | password123 |
| Patient | patient@example.com | password123 |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Hostinger VPS                    │
│  ┌───────────────────────────────────────────┐  │
│  │           Docker Compose                   │  │
│  │  ┌────────┐  ┌─────────┐  ┌───────────┐  │  │
│  │  │ Nginx  │→ │ Next.js │→ │PostgreSQL │  │  │
│  │  │ (SSL)  │  │  :3000  │  │   :5432   │  │  │
│  │  └────────┘  └─────────┘  └───────────┘  │  │
│  │              ┌─────────┐  ┌───────────┐  │  │
│  │              │ Worker  │→ │  Redis    │  │  │
│  │              │(BullMQ) │  │   :6379   │  │  │
│  │              └─────────┘  └───────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Multi-tenancy:** Shared database with tenant column (`clinic_id`) on all tables. Wildcard subdomain routing (`clinic-slug.dentalbook.ph`). For local dev, use `?clinic=slug` query parameter.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js API Routes |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Auth | JWT (jose) + bcrypt |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Docker Compose + Nginx |

## Project Structure

```
src/
├── app/
│   ├── (public)/              # Patient-facing pages
│   │   ├── page.tsx           # Clinic landing page
│   │   ├── book/              # 6-step booking wizard
│   │   ├── login/             # Patient login
│   │   ├── register/          # Patient registration
│   │   └── dashboard/         # Patient dashboard
│   ├── staff/                 # Staff portal
│   │   ├── page.tsx           # Dashboard
│   │   ├── appointments/      # Appointment management
│   │   ├── calendar/          # Calendar views
│   │   ├── dentists/          # Dentist management
│   │   ├── services/          # Service management
│   │   ├── patients/          # Patient records
│   │   ├── payments/          # Payment tracking
│   │   ├── reports/           # Analytics
│   │   ├── waitlist/          # Waitlist
│   │   └── settings/          # Clinic settings
│   ├── admin/                 # Super admin panel
│   └── api/                   # API routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── booking/               # Booking flow components
│   ├── patient/               # Patient components
│   ├── staff/                 # Staff components
│   └── admin/                 # Admin components
├── db/
│   ├── schema/                # Drizzle ORM schemas (11 tables)
│   ├── index.ts               # Database connection
│   └── seed.ts                # Seed script
├── hooks/                     # React hooks
├── lib/                       # Utilities (auth, email, booking engine)
├── middleware.ts              # Subdomain routing
└── worker.ts                  # Background job worker
```

## Database Schema (11 tables)

| Table | Purpose |
|-------|---------|
| `clinics` | Clinic profiles, branding, operating hours |
| `users` | All users (patients, dentists, admins) |
| `dentists` | Dentist profiles, schedules, specializations |
| `services` | Clinic services (cleaning, extraction, etc.) |
| `dentist_services` | Which dentists offer which services |
| `appointments` | Booked appointments with status tracking |
| `treatment_records` | Clinical notes, diagnosis, procedures |
| `patient_profiles` | Medical history, allergies, emergency contacts |
| `notifications` | Email notification tracking |
| `waitlist` | Patients waiting for open slots |
| `subscriptions` | Platform billing per clinic |

## API Endpoints (35+ routes)

### Authentication
- `POST /api/auth/register` — Patient registration
- `POST /api/auth/login` — Login (JWT)
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Current user

### Public
- `GET /api/clinics/:slug` — Clinic info + branding
- `GET /api/clinics/:slug/services` — Available services
- `GET /api/clinics/:slug/dentists` — Available dentists

### Booking Engine
- `GET /api/bookings/slots` — Available time slots
- `POST /api/bookings` — Create appointment (with double-booking prevention)
- `GET /api/bookings/:id` — Appointment details
- `PATCH /api/bookings/:id` — Reschedule/cancel
- `POST /api/bookings/:id/payment-proof` — Upload payment screenshot

### Patient Dashboard
- `GET /api/patient/appointments` — My appointments
- `GET /api/patient/treatment-history` — Treatment records
- `GET/PUT /api/patient/profile` — Medical profile

### Staff Portal
- `GET /api/staff/dashboard` — Dashboard stats
- `GET /api/staff/appointments` — Filterable appointment list
- `PATCH /api/staff/appointments/:id` — Update status/payment
- `GET/POST /api/staff/dentists` — Dentist management
- `GET/POST /api/staff/services` — Service management
- `GET /api/staff/patients` — Patient list
- `GET/PUT /api/staff/clinic/settings` — Clinic settings + branding
- `POST /api/staff/treatment-records` — Log treatment
- `GET /api/staff/reports` — Analytics
- `GET/POST/PATCH /api/staff/waitlist` — Waitlist management

### Super Admin
- `GET/POST /api/admin/clinics` — Clinic management
- `GET/PATCH /api/admin/clinics/:id` — Clinic detail
- `GET /api/admin/analytics` — Platform analytics
- `GET /api/admin/subscriptions` — Subscription management

### Files
- `POST /api/upload` — Upload files (logos, QR codes, dental records)
- `GET /api/uploads/[...path]` — Serve uploaded files

## Booking Flow

6-step wizard (under 60 seconds):

1. **Select Service** — grid of service cards with prices
2. **Select Dentist** — optional, can skip for "any available"
3. **Choose Date & Time** — calendar + dynamic time slot grid
4. **Enter Details** — patient information form
5. **Payment** — clinic QR code + upload proof screenshot
6. **Confirmation** — success page with appointment summary

## Payment Flow (QR-based, no gateway fees)

1. Clinic admin uploads their GCash/Maya QR code in settings
2. Patient sees QR during booking, pays via their own app
3. Patient uploads payment screenshot as proof
4. Staff reviews proof in payments page, confirms/rejects
5. Patient receives email notification

## Email Notifications

Via Gmail SMTP (free). Templates for:
- Booking confirmation
- Appointment reminder (24h + 2h before)
- Payment confirmed
- Appointment cancelled

Background worker (BullMQ) processes scheduled reminders.

## Monetization

| Tier | PHP/month | Features |
|------|-----------|----------|
| Starter | 1,500 | 1 dentist, basic booking, email |
| Professional | 3,500 | 5 dentists, analytics, waitlist, treatment records |
| Enterprise | 7,000 | Unlimited dentists, custom branding, priority support |

## Production Deployment (Hostinger VPS)

```bash
# 1. Clone and configure
git clone <your-repo> /opt/dentalbook && cd /opt/dentalbook
cp .env.production.example .env.production
# Edit .env.production with real values

# 2. Deploy
./scripts/deploy.sh

# 3. SSL certificate
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d dentalbook.ph -d *.dentalbook.ph

# 4. Daily backups (cron)
0 2 * * * /opt/dentalbook/scripts/backup.sh
```

### Adding a New Clinic

1. Login as super admin at `admin.dentalbook.ph`
2. Clinics → Add Clinic → set name, slug, email, tier
3. Clinic accessible at `{slug}.dentalbook.ph`
4. Share admin credentials with the clinic

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run db:generate   # Generate Drizzle migrations
npm run db:push       # Push schema to database
npm run db:seed       # Seed demo data
npm run db:studio     # Open Drizzle Studio (DB GUI)
npm run worker        # Start background job worker
```

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | 64-char random string for access tokens |
| `JWT_REFRESH_SECRET` | 64-char random string for refresh tokens |
| `NEXT_PUBLIC_APP_DOMAIN` | Your domain (e.g., `dentalbook.ph`) |
| `SMTP_USER` | Gmail address for sending emails |
| `SMTP_PASS` | Gmail app password |

## Future Roadmap

- Facebook Messenger notifications
- SMS via Semaphore
- Web push notifications
- AI schedule optimization (Claude API)
- AI patient chat assistant
- PayMongo/Stripe online payments
- Tele-dentistry video calls
- Mobile app (React Native)
- Multi-branch clinic support
- Marketing tools (promotions, loyalty programs)
