# Dental Booking Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant, white-label dental booking SaaS platform with patient booking, staff portal, QR payments, and email notifications — deployed via Docker on Hostinger VPS.

**Architecture:** Full-stack Next.js 15 (App Router) with Drizzle ORM on PostgreSQL. Shared database with tenant column + RLS for multi-tenancy. Redis + BullMQ for job queues. Wildcard subdomain routing via Nginx. Gmail SMTP for notifications.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ, Tailwind CSS, shadcn/ui, Nodemailer, Docker Compose, Nginx

**Project Root:** `/Users/leedalmogbel/server/public/projects/nextjs/dental-booking`

---

## Task 1: Project Scaffolding + Docker Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `.env.example`
- Create: `.env.local`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `docker/nginx/nginx.conf`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Initialize Next.js project**

```bash
cd /Users/leedalmogbel/server/public/projects/nextjs/dental-booking
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Install core dependencies**

```bash
npm install drizzle-orm postgres dotenv bcryptjs jose nodemailer bullmq ioredis uuid zod date-fns
npm install -D drizzle-kit @types/bcryptjs @types/nodemailer @types/uuid tsx
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input label select dialog table tabs badge calendar dropdown-menu form toast sheet avatar separator skeleton switch textarea popover command
```

**Step 4: Create `.env.example`**

```env
# Database
DATABASE_URL=postgresql://dental:dental123@localhost:5432/dentalbook

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-to-64-char-random-string
JWT_REFRESH_SECRET=change-me-to-another-64-char-string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost:3000

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="DentalBook <noreply@dentalbook.ph>"

# File uploads
UPLOAD_DIR=./uploads
```

**Step 5: Create `.env.local`** (copy of .env.example with dev values)

**Step 6: Create `docker-compose.yml`**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dentalbook
      POSTGRES_USER: dental
      POSTGRES_PASSWORD: dental123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 7: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 8: Create `docker/nginx/nginx.conf`**

```nginx
server {
    listen 80;
    server_name *.dentalbook.ph dentalbook.ph;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

**Step 9: Update `.gitignore`** — add `uploads/`, `.env.local`

**Step 10: Add `output: 'standalone'` to `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

**Step 11: Start Docker services and verify**

```bash
docker compose up -d
npm run dev
```
Open http://localhost:3000 — should see Next.js default page.

**Step 12: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Docker, Nginx, and core dependencies"
```

---

## Task 2: Database Schema with Drizzle ORM

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/schema/clinics.ts`
- Create: `src/db/schema/users.ts`
- Create: `src/db/schema/dentists.ts`
- Create: `src/db/schema/services.ts`
- Create: `src/db/schema/appointments.ts`
- Create: `src/db/schema/treatment-records.ts`
- Create: `src/db/schema/patient-profiles.ts`
- Create: `src/db/schema/notifications.ts`
- Create: `src/db/schema/waitlist.ts`
- Create: `src/db/schema/subscriptions.ts`
- Create: `src/db/schema/index.ts`
- Create: `drizzle.config.ts`

**Step 1: Create Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 2: Create database connection**

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**Step 3: Create clinics schema**

```typescript
// src/db/schema/clinics.ts
import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["starter", "professional", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "cancelled", "trial"]);

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#2563EB"),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#1E40AF"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Manila"),
  operatingHours: jsonb("operating_hours").$type<Record<string, { start: string; end: string }>>(),
  qrCodeUrl: text("qr_code_url"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("trial"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 4: Create users schema**

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const userRoleEnum = pgEnum("user_role", ["patient", "clinic_admin", "dentist", "super_admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 20 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: userRoleEnum("role").notNull().default("patient"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("users_email_clinic_unique").on(table.email, table.clinicId),
]);
```

**Step 5: Create dentists schema**

```typescript
// src/db/schema/dentists.ts
import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { clinics } from "./clinics";

export const dentists = pgTable("dentists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  specialization: varchar("specialization", { length: 100 }),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  workingHours: jsonb("working_hours").$type<Record<string, { start: string; end: string; breakStart?: string; breakEnd?: string }>>(),
  workingDays: jsonb("working_days").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 6: Create services schema**

```typescript
// src/db/schema/services.ts
import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  requiredSpecialization: varchar("required_specialization", { length: 100 }),
  preInstructions: text("pre_instructions"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 7: Create dentist_services junction table**

```typescript
// src/db/schema/dentist-services.ts
import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { dentists } from "./dentists";
import { services } from "./services";

export const dentistServices = pgTable("dentist_services", {
  dentistId: uuid("dentist_id").references(() => dentists.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.dentistId, table.serviceId] }),
]);
```

**Step 8: Create appointments schema**

```typescript
// src/db/schema/appointments.ts
import { pgTable, uuid, date, time, text, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./users";
import { dentists } from "./dentists";
import { services } from "./services";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid", "proof_submitted", "confirmed", "refunded"
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  patientId: uuid("patient_id").references(() => users.id).notNull(),
  dentistId: uuid("dentist_id").references(() => dentists.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: appointmentStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
  paymentProofUrl: text("payment_proof_url"),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 9: Create remaining schemas** (treatment_records, patient_profiles, notifications, waitlist, subscriptions)

```typescript
// src/db/schema/treatment-records.ts
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { dentists } from "./dentists";
import { users } from "./users";
import { clinics } from "./clinics";

export const treatmentRecords = pgTable("treatment_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id).notNull(),
  dentistId: uuid("dentist_id").references(() => dentists.id).notNull(),
  patientId: uuid("patient_id").references(() => users.id).notNull(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  diagnosis: text("diagnosis"),
  proceduresDone: text("procedures_done"),
  notes: text("notes"),
  attachments: jsonb("attachments").$type<{ url: string; type: string; name: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// src/db/schema/patient-profiles.ts
import { pgTable, uuid, date, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { clinics } from "./clinics";

export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  address: text("address"),
  medicalHistory: jsonb("medical_history"),
  allergies: jsonb("allergies"),
  dentalConcerns: text("dental_concerns"),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// src/db/schema/notifications.ts
import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./users";

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 20 }).default("email").notNull(),
  status: notificationStatusEnum("status").default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  content: jsonb("content").$type<{ subject: string; body: string; templateData?: Record<string, string> }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// src/db/schema/waitlist.ts
import { pgTable, uuid, date, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./users";
import { services } from "./services";
import { dentists } from "./dentists";

export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "notified", "booked", "expired"]);

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  patientId: uuid("patient_id").references(() => users.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  preferredDentistId: uuid("preferred_dentist_id").references(() => dentists.id),
  preferredDate: date("preferred_date"),
  preferredTimeRange: jsonb("preferred_time_range").$type<{ start: string; end: string }>(),
  status: waitlistStatusEnum("status").default("waiting").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// src/db/schema/subscriptions.ts
import { pgTable, uuid, date, decimal, timestamp } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { subscriptionTierEnum, subscriptionStatusEnum } from "./clinics";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").default("trial").notNull(),
  currentPeriodStart: date("current_period_start"),
  currentPeriodEnd: date("current_period_end"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 10: Create barrel export**

```typescript
// src/db/schema/index.ts
export * from "./clinics";
export * from "./users";
export * from "./dentists";
export * from "./services";
export * from "./dentist-services";
export * from "./appointments";
export * from "./treatment-records";
export * from "./patient-profiles";
export * from "./notifications";
export * from "./waitlist";
export * from "./subscriptions";
```

**Step 11: Run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Step 12: Verify tables exist**

```bash
docker compose exec postgres psql -U dental -d dentalbook -c "\dt"
```

Expected: all tables listed.

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: add complete database schema with Drizzle ORM"
```

---

## Task 3: Database Seed Script

**Files:**
- Create: `src/db/seed.ts`
- Modify: `package.json` (add seed script)

**Step 1: Create seed script with demo clinic, admin, dentists, and services**

```typescript
// src/db/seed.ts
import { db } from "./index";
import { clinics, users, dentists, services, dentistServices } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create demo clinic
  const [clinic] = await db.insert(clinics).values({
    name: "Smile Dental Clinic",
    slug: "smile-dental",
    primaryColor: "#2563EB",
    secondaryColor: "#1E40AF",
    address: "123 Rizal Ave, Makati City",
    phone: "+63 912 345 6789",
    email: "info@smileclinic.ph",
    timezone: "Asia/Manila",
    operatingHours: {
      mon: { start: "09:00", end: "17:00" },
      tue: { start: "09:00", end: "17:00" },
      wed: { start: "09:00", end: "17:00" },
      thu: { start: "09:00", end: "17:00" },
      fri: { start: "09:00", end: "17:00" },
      sat: { start: "09:00", end: "13:00" },
    },
    subscriptionTier: "professional",
    subscriptionStatus: "active",
  }).returning();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create super admin (no clinic)
  await db.insert(users).values({
    email: "admin@dentalbook.ph",
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
  });

  // Create clinic admin
  await db.insert(users).values({
    clinicId: clinic.id,
    email: "admin@smileclinic.ph",
    passwordHash,
    firstName: "Maria",
    lastName: "Santos",
    role: "clinic_admin",
  });

  // Create dentist users + dentist profiles
  const [dentistUser1] = await db.insert(users).values({
    clinicId: clinic.id,
    email: "dr.cruz@smileclinic.ph",
    passwordHash,
    firstName: "Juan",
    lastName: "Cruz",
    role: "dentist",
  }).returning();

  const [dentistUser2] = await db.insert(users).values({
    clinicId: clinic.id,
    email: "dr.reyes@smileclinic.ph",
    passwordHash,
    firstName: "Ana",
    lastName: "Reyes",
    role: "dentist",
  }).returning();

  const [dentist1] = await db.insert(dentists).values({
    userId: dentistUser1.id,
    clinicId: clinic.id,
    specialization: "General Dentistry",
    bio: "10 years of experience in general dentistry.",
    workingDays: ["mon", "tue", "wed", "thu", "fri"],
    workingHours: {
      mon: { start: "09:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      tue: { start: "09:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      wed: { start: "09:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      thu: { start: "09:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      fri: { start: "09:00", end: "17:00", breakStart: "12:00", breakEnd: "13:00" },
    },
  }).returning();

  const [dentist2] = await db.insert(dentists).values({
    userId: dentistUser2.id,
    clinicId: clinic.id,
    specialization: "Orthodontics",
    bio: "Specialist in braces and teeth alignment.",
    workingDays: ["mon", "wed", "fri"],
    workingHours: {
      mon: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      wed: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      fri: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
    },
  }).returning();

  // Create services
  const serviceData = [
    { name: "Dental Cleaning", durationMinutes: 30, price: "500.00", color: "#22C55E" },
    { name: "Tooth Extraction", durationMinutes: 45, price: "1500.00", color: "#EF4444" },
    { name: "Root Canal", durationMinutes: 90, price: "5000.00", color: "#8B5CF6" },
    { name: "Consultation", durationMinutes: 20, price: "300.00", color: "#3B82F6" },
    { name: "Orthodontic Adjustment", durationMinutes: 30, price: "1000.00", requiredSpecialization: "Orthodontics", color: "#F59E0B" },
    { name: "Teeth Whitening", durationMinutes: 60, price: "3000.00", color: "#EC4899" },
    { name: "Emergency Appointment", durationMinutes: 30, price: "800.00", color: "#DC2626" },
  ];

  const createdServices = await db.insert(services).values(
    serviceData.map((s) => ({ ...s, clinicId: clinic.id }))
  ).returning();

  // Link dentists to services
  const dentist1Services = createdServices.filter((s) => s.requiredSpecialization !== "Orthodontics");
  const dentist2Services = createdServices.filter((s) => s.requiredSpecialization === "Orthodontics" || !s.requiredSpecialization);

  await db.insert(dentistServices).values([
    ...dentist1Services.map((s) => ({ dentistId: dentist1.id, serviceId: s.id })),
    ...dentist2Services.map((s) => ({ dentistId: dentist2.id, serviceId: s.id })),
  ]);

  // Create a sample patient
  await db.insert(users).values({
    clinicId: clinic.id,
    email: "patient@example.com",
    passwordHash,
    firstName: "Pedro",
    lastName: "Dela Cruz",
    role: "patient",
  });

  console.log("Seed complete!");
  console.log("Demo clinic slug: smile-dental");
  console.log("Admin login: admin@smileclinic.ph / password123");
  console.log("Dentist login: dr.cruz@smileclinic.ph / password123");
  console.log("Patient login: patient@example.com / password123");
  console.log("Super admin: admin@dentalbook.ph / password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

**Step 2: Add seed script to `package.json`**

```json
"scripts": {
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:seed": "tsx src/db/seed.ts",
  "db:studio": "drizzle-kit studio"
}
```

**Step 3: Run seed**

```bash
npm run db:seed
```

Expected: "Seed complete!" with login credentials printed.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add database seed script with demo clinic data"
```

---

## Task 4: Authentication System (JWT)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/password.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/refresh/route.ts`
- Create: `src/lib/api-utils.ts`
- Create: `src/lib/validations/auth.ts`

**Step 1: Create password utility**

```typescript
// src/lib/password.ts
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Step 2: Create JWT auth utility**

```typescript
// src/lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export interface JWTPayload {
  userId: string;
  clinicId: string | null;
  role: string;
}

export async function createAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) return null;
  return user;
}
```

**Step 3: Create API utilities**

```typescript
// src/lib/api-utils.ts
import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
```

**Step 4: Create auth validation schemas**

```typescript
// src/lib/validations/auth.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  clinicSlug: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

**Step 5: Create register endpoint**

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message);

  const { email, password, firstName, lastName, phone, clinicSlug } = parsed.data;

  // Find clinic
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, clinicSlug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  // Check if email already exists for this clinic
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.clinicId, clinic.id)))
    .limit(1);
  if (existing) return errorResponse("Email already registered");

  const passwordHash = await hashPassword(password);

  const [user] = await db.insert(users).values({
    clinicId: clinic.id,
    email,
    passwordHash,
    firstName,
    lastName,
    phone,
    role: "patient",
  }).returning();

  const tokenPayload = { userId: user.id, clinicId: clinic.id, role: user.role };
  const accessToken = await createAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(tokenPayload);

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });
  cookieStore.set("refresh_token", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800 });

  return jsonResponse({
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  }, 201);
}
```

**Step 6: Create login endpoint**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, clinics, dentists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message);

  const { email, password } = parsed.data;

  // Get clinic slug from header (set by middleware from subdomain)
  const clinicSlug = req.headers.get("x-clinic-slug");

  let user;
  if (clinicSlug && clinicSlug !== "admin") {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, clinicSlug)).limit(1);
    if (!clinic) return errorResponse("Clinic not found", 404);
    [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.clinicId, clinic.id))).limit(1);
  } else {
    // Super admin login (no clinic) or fallback
    [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.role, "super_admin"))).limit(1);
  }

  if (!user) return errorResponse("Invalid credentials", 401);
  if (!user.isActive) return errorResponse("Account deactivated", 403);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return errorResponse("Invalid credentials", 401);

  const tokenPayload = { userId: user.id, clinicId: user.clinicId, role: user.role };
  const accessToken = await createAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(tokenPayload);

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });
  cookieStore.set("refresh_token", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800 });

  // If dentist, include dentist profile id
  let dentistId = null;
  if (user.role === "dentist") {
    const [dentist] = await db.select().from(dentists).where(eq(dentists.userId, user.id)).limit(1);
    dentistId = dentist?.id ?? null;
  }

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clinicId: user.clinicId,
      dentistId,
    },
  });
}
```

**Step 7: Create `/api/auth/me` and `/api/auth/refresh` endpoints**

```typescript
// src/app/api/auth/me/route.ts
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clinicId: user.clinicId,
    },
  });
}
```

```typescript
// src/app/api/auth/refresh/route.ts
import { cookies } from "next/headers";
import { verifyRefreshToken, createAccessToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) return errorResponse("No refresh token", 401);

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return errorResponse("Invalid refresh token", 401);

  const accessToken = await createAccessToken(payload);
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });

  return jsonResponse({ success: true });
}
```

**Step 8: Test auth endpoints**

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","firstName":"Test","lastName":"User","clinicSlug":"smile-dental"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-clinic-slug: smile-dental" \
  -d '{"email":"admin@smileclinic.ph","password":"password123"}'
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add JWT authentication with register, login, refresh, and me endpoints"
```

---

## Task 5: Multi-Tenant Middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/tenant.ts`

**Step 1: Create tenant context utility**

```typescript
// src/lib/tenant.ts
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getClinicBySlug = cache(async (slug: string) => {
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  return clinic ?? null;
});
```

**Step 2: Create middleware for subdomain extraction**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

  // Extract subdomain
  let clinicSlug = "";

  if (hostname === appDomain || hostname === `www.${appDomain}`) {
    // Main domain — landing page or super admin
    clinicSlug = "";
  } else if (hostname.endsWith(`.${appDomain}`)) {
    clinicSlug = hostname.replace(`.${appDomain}`, "");
  } else {
    // Local dev: use query param or header as fallback
    clinicSlug = request.nextUrl.searchParams.get("clinic") || "";
  }

  // Set clinic slug in header for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clinic-slug", clinicSlug);

  // Protect staff routes
  if (request.nextUrl.pathname.startsWith("/staff")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

**Step 3: Test middleware locally**

```bash
# Access with clinic query param (dev mode)
curl http://localhost:3000?clinic=smile-dental -v
# Check x-clinic-slug header is set in response
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add multi-tenant middleware with subdomain extraction"
```

---

## Task 6: Clinic Public API + Branding

**Files:**
- Create: `src/app/api/clinics/[slug]/route.ts`
- Create: `src/app/api/clinics/[slug]/services/route.ts`
- Create: `src/app/api/clinics/[slug]/dentists/route.ts`
- Create: `src/lib/clinic-context.ts`

**Step 1: Create clinic context helper (server component)**

```typescript
// src/lib/clinic-context.ts
import { headers } from "next/headers";
import { getClinicBySlug } from "./tenant";

export async function getClinicFromRequest() {
  const headersList = await headers();
  const slug = headersList.get("x-clinic-slug");
  if (!slug) return null;
  return getClinicBySlug(slug);
}
```

**Step 2: Create clinic info endpoint**

```typescript
// src/app/api/clinics/[slug]/route.ts
import { NextRequest } from "next/server";
import { getClinicBySlug } from "@/lib/tenant";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return errorResponse("Clinic not found", 404);

  return jsonResponse({
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    logoUrl: clinic.logoUrl,
    primaryColor: clinic.primaryColor,
    secondaryColor: clinic.secondaryColor,
    address: clinic.address,
    phone: clinic.phone,
    email: clinic.email,
    operatingHours: clinic.operatingHours,
  });
}
```

**Step 3: Create services and dentists endpoints**

```typescript
// src/app/api/clinics/[slug]/services/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { services, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  const clinicServices = await db
    .select()
    .from(services)
    .where(and(eq(services.clinicId, clinic.id), eq(services.isActive, true)))
    .orderBy(services.sortOrder);

  return jsonResponse(clinicServices);
}
```

```typescript
// src/app/api/clinics/[slug]/dentists/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { dentists, users, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  const clinicDentists = await db
    .select({
      id: dentists.id,
      specialization: dentists.specialization,
      bio: dentists.bio,
      photoUrl: dentists.photoUrl,
      workingDays: dentists.workingDays,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(dentists)
    .innerJoin(users, eq(dentists.userId, users.id))
    .where(and(eq(dentists.clinicId, clinic.id), eq(dentists.isActive, true)));

  return jsonResponse(clinicDentists);
}
```

**Step 4: Test endpoints**

```bash
curl http://localhost:3000/api/clinics/smile-dental
curl http://localhost:3000/api/clinics/smile-dental/services
curl http://localhost:3000/api/clinics/smile-dental/dentists
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public clinic, services, and dentists API endpoints"
```

---

## Task 7: Booking Engine — Time Slot Generation

**Files:**
- Create: `src/lib/booking-engine.ts`
- Create: `src/app/api/bookings/slots/route.ts`
- Create: `src/lib/validations/booking.ts`

**Step 1: Create booking validation schemas**

```typescript
// src/lib/validations/booking.ts
import { z } from "zod";

export const slotsQuerySchema = z.object({
  clinicId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dentistId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createBookingSchema = z.object({
  clinicId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dentistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});
```

**Step 2: Create booking engine with slot generation algorithm**

```typescript
// src/lib/booking-engine.ts
import { db } from "@/db";
import { clinics, dentists, services, appointments, dentistServices, users } from "@/db/schema";
import { eq, and, not, inArray } from "drizzle-orm";

interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "09:30"
}

interface DentistAvailability {
  dentistId: string;
  dentistName: string;
  slots: TimeSlot[];
}

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function slotsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function generateAvailableSlots(
  clinicId: string,
  serviceId: string,
  date: string,
  dentistId?: string
): Promise<{ dentists: DentistAvailability[]; earliestSlot: { dentistId: string; time: string } | null }> {
  const dateObj = new Date(date);
  const dayOfWeek = DAY_MAP[dateObj.getDay()];

  // 1. Get clinic
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  if (!clinic?.operatingHours) return { dentists: [], earliestSlot: null };

  const clinicHours = (clinic.operatingHours as Record<string, { start: string; end: string }>)[dayOfWeek];
  if (!clinicHours) return { dentists: [], earliestSlot: null }; // Clinic closed

  // 2. Get service duration
  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) return { dentists: [], earliestSlot: null };
  const duration = service.durationMinutes;

  // 3. Get eligible dentists
  let eligibleDentistIds: string[] = [];
  if (dentistId) {
    eligibleDentistIds = [dentistId];
  } else {
    const links = await db
      .select({ dentistId: dentistServices.dentistId })
      .from(dentistServices)
      .where(eq(dentistServices.serviceId, serviceId));
    eligibleDentistIds = links.map((l) => l.dentistId);
  }

  if (eligibleDentistIds.length === 0) return { dentists: [], earliestSlot: null };

  // 4. Get dentist details
  const dentistList = await db
    .select({
      id: dentists.id,
      workingHours: dentists.workingHours,
      workingDays: dentists.workingDays,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(dentists)
    .innerJoin(users, eq(dentists.userId, users.id))
    .where(and(eq(dentists.isActive, true), inArray(dentists.id, eligibleDentistIds)));

  // 5. Get existing appointments for this date
  const existingAppts = await db
    .select({ dentistId: appointments.dentistId, startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.date, date),
        not(inArray(appointments.status, ["cancelled"]))
      )
    );

  const result: DentistAvailability[] = [];
  let earliestSlot: { dentistId: string; time: string } | null = null;

  for (const dentist of dentistList) {
    const workingDays = dentist.workingDays as string[] | null;
    if (!workingDays?.includes(dayOfWeek)) continue;

    const workingHours = dentist.workingHours as Record<string, { start: string; end: string; breakStart?: string; breakEnd?: string }> | null;
    const dentistHours = workingHours?.[dayOfWeek];
    if (!dentistHours) continue;

    // Calculate effective window
    const windowStart = Math.max(timeToMinutes(clinicHours.start), timeToMinutes(dentistHours.start));
    const windowEnd = Math.min(timeToMinutes(clinicHours.end), timeToMinutes(dentistHours.end));

    const breakStart = dentistHours.breakStart ? timeToMinutes(dentistHours.breakStart) : null;
    const breakEnd = dentistHours.breakEnd ? timeToMinutes(dentistHours.breakEnd) : null;

    // Get this dentist's existing appointments
    const dentistAppts = existingAppts
      .filter((a) => a.dentistId === dentist.id)
      .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }));

    // Generate slots
    const slots: TimeSlot[] = [];
    for (let slotStart = windowStart; slotStart + duration <= windowEnd; slotStart += 30) {
      const slotEnd = slotStart + duration;

      // Check break overlap
      if (breakStart !== null && breakEnd !== null && slotsOverlap(slotStart, slotEnd, breakStart, breakEnd)) continue;

      // Check appointment overlap
      const hasConflict = dentistAppts.some((a) => slotsOverlap(slotStart, slotEnd, a.start, a.end));
      if (hasConflict) continue;

      slots.push({ start: minutesToTime(slotStart), end: minutesToTime(slotEnd) });
    }

    if (slots.length > 0) {
      result.push({
        dentistId: dentist.id,
        dentistName: `Dr. ${dentist.firstName} ${dentist.lastName}`,
        slots,
      });

      if (!earliestSlot || timeToMinutes(slots[0].start) < timeToMinutes(earliestSlot.time)) {
        earliestSlot = { dentistId: dentist.id, time: slots[0].start };
      }
    }
  }

  return { dentists: result, earliestSlot };
}
```

**Step 3: Create slots API endpoint**

```typescript
// src/app/api/bookings/slots/route.ts
import { NextRequest } from "next/server";
import { generateAvailableSlots } from "@/lib/booking-engine";
import { slotsQuerySchema } from "@/lib/validations/booking";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = slotsQuerySchema.safeParse(searchParams);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message);

  const { clinicId, serviceId, dentistId, date } = parsed.data;
  const result = await generateAvailableSlots(clinicId, serviceId, date, dentistId);

  return jsonResponse(result);
}
```

**Step 4: Test slot generation**

```bash
# Replace IDs with actual UUIDs from seed
curl "http://localhost:3000/api/bookings/slots?clinicId=<CLINIC_ID>&serviceId=<SERVICE_ID>&date=2026-03-09"
```

Expected: list of dentists with available time slots for that date.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add booking engine with dynamic time slot generation"
```

---

## Task 8: Booking Engine — Create Appointment + Double-Booking Prevention

**Files:**
- Create: `src/app/api/bookings/route.ts`
- Create: `src/app/api/bookings/[id]/route.ts`
- Create: `src/app/api/bookings/[id]/payment-proof/route.ts`

**Step 1: Create appointment booking endpoint**

```typescript
// src/app/api/bookings/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { and, eq, not, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations/booking";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message);

  const { clinicId, serviceId, dentistId, date, startTime, notes } = parsed.data;

  // Get service duration
  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) return errorResponse("Service not found", 404);

  // Calculate end time
  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + service.durationMinutes;
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

  // Check for overlapping appointments (double-booking prevention)
  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.dentistId, dentistId),
        eq(appointments.date, date),
        not(eq(appointments.status, "cancelled")),
        // Overlap check: existing.start < new.end AND existing.end > new.start
        sql`${appointments.startTime} < ${endTime}::time`,
        sql`${appointments.endTime} > ${startTime}::time`
      )
    )
    .limit(1);

  if (conflicts.length > 0) {
    return errorResponse("This time slot is no longer available. Please select another.", 409);
  }

  const [appointment] = await db.insert(appointments).values({
    clinicId,
    patientId: user.id,
    dentistId,
    serviceId,
    date,
    startTime,
    endTime,
    status: "pending",
    paymentStatus: "unpaid",
    paymentAmount: service.price,
    notes,
  }).returning();

  return jsonResponse(appointment, 201);
}
```

**Step 2: Create appointment detail + update (reschedule/cancel) endpoint**

```typescript
// src/app/api/bookings/[id]/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!appointment) return errorResponse("Appointment not found", 404);

  // Get related data
  const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
  const [dentist] = await db.select().from(dentists).where(eq(dentists.id, appointment.dentistId)).limit(1);
  const [dentistUser] = dentist ? await db.select().from(users).where(eq(users.id, dentist.userId)).limit(1) : [null];

  return jsonResponse({
    ...appointment,
    service: service ? { name: service.name, durationMinutes: service.durationMinutes, price: service.price } : null,
    dentist: dentistUser ? { name: `Dr. ${dentistUser.firstName} ${dentistUser.lastName}`, specialization: dentist?.specialization } : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const body = await req.json();

  // Patients can only cancel their own appointments
  if (user.role === "patient") {
    const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.patientId, user.id))).limit(1);
    if (!appt) return errorResponse("Appointment not found", 404);

    if (body.status === "cancelled") {
      const [updated] = await db.update(appointments)
        .set({ status: "cancelled", cancellationReason: body.cancellationReason || "Cancelled by patient", updatedAt: new Date() })
        .where(eq(appointments.id, id))
        .returning();
      return jsonResponse(updated);
    }
  }

  // Staff can update any appointment in their clinic
  if (user.role === "clinic_admin" || user.role === "dentist") {
    const [updated] = await db.update(appointments)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, user.clinicId!)))
      .returning();
    if (!updated) return errorResponse("Appointment not found", 404);
    return jsonResponse(updated);
  }

  return errorResponse("Unauthorized", 403);
}
```

**Step 3: Create payment proof upload endpoint**

```typescript
// src/app/api/bookings/[id]/payment-proof/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const [appt] = await db.select().from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.patientId, user.id)))
    .limit(1);
  if (!appt) return errorResponse("Appointment not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return errorResponse("No file uploaded");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "payments");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${id}-${Date.now()}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  const [updated] = await db.update(appointments)
    .set({
      paymentProofUrl: `/uploads/payments/${filename}`,
      paymentStatus: "proof_submitted",
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id))
    .returning();

  return jsonResponse(updated);
}
```

**Step 4: Test booking flow**

```bash
# 1. Login as patient
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-clinic-slug: smile-dental" \
  -d '{"email":"patient@example.com","password":"password123"}' -c cookies.txt

# 2. Get available slots
curl "http://localhost:3000/api/bookings/slots?clinicId=<ID>&serviceId=<ID>&date=2026-03-09" -b cookies.txt

# 3. Book appointment
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"clinicId":"<ID>","serviceId":"<ID>","dentistId":"<ID>","date":"2026-03-09","startTime":"10:00"}'
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add appointment booking with double-booking prevention and payment proof upload"
```

---

## Task 9: Patient Dashboard API

**Files:**
- Create: `src/app/api/patient/appointments/route.ts`
- Create: `src/app/api/patient/treatment-history/route.ts`
- Create: `src/app/api/patient/profile/route.ts`

**Step 1: Create patient appointments endpoint**

```typescript
// src/app/api/patient/appointments/route.ts
import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const patientAppts = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      serviceName: services.name,
      serviceColor: services.color,
      dentistFirstName: users.firstName,
      dentistLastName: users.lastName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(dentists, eq(appointments.dentistId, dentists.id))
    .innerJoin(users, eq(dentists.userId, users.id))
    .where(eq(appointments.patientId, user.id))
    .orderBy(desc(appointments.date));

  return jsonResponse(patientAppts);
}
```

**Step 2: Create treatment history and profile endpoints** (similar pattern — query by patient user id, return related records)

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add patient dashboard API endpoints"
```

---

## Task 10: Staff Portal API

**Files:**
- Create: `src/lib/middleware/require-staff.ts`
- Create: `src/app/api/staff/appointments/route.ts`
- Create: `src/app/api/staff/appointments/[id]/route.ts`
- Create: `src/app/api/staff/dashboard/route.ts`
- Create: `src/app/api/staff/dentists/route.ts`
- Create: `src/app/api/staff/dentists/[id]/route.ts`
- Create: `src/app/api/staff/services/route.ts`
- Create: `src/app/api/staff/services/[id]/route.ts`
- Create: `src/app/api/staff/patients/route.ts`
- Create: `src/app/api/staff/patients/[id]/route.ts`
- Create: `src/app/api/staff/clinic/settings/route.ts`
- Create: `src/app/api/staff/reports/route.ts`
- Create: `src/app/api/staff/treatment-records/route.ts`

**Step 1: Create staff auth guard**

```typescript
// src/lib/middleware/require-staff.ts
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: errorResponse("Not authenticated", 401) };
  if (!["clinic_admin", "dentist"].includes(user.role)) {
    return { user: null, error: errorResponse("Staff access required", 403) };
  }
  return { user, error: null };
}
```

**Step 2: Create staff dashboard stats endpoint**

```typescript
// src/app/api/staff/dashboard/route.ts
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const today = new Date().toISOString().split("T")[0];

  const [todayStats] = await db
    .select({
      totalToday: count(),
      confirmed: count(sql`CASE WHEN ${appointments.status} = 'confirmed' THEN 1 END`),
      pending: count(sql`CASE WHEN ${appointments.status} = 'pending' THEN 1 END`),
      completed: count(sql`CASE WHEN ${appointments.status} = 'completed' THEN 1 END`),
      pendingPayments: count(sql`CASE WHEN ${appointments.paymentStatus} = 'proof_submitted' THEN 1 END`),
    })
    .from(appointments)
    .where(and(eq(appointments.clinicId, user!.clinicId!), eq(appointments.date, today)));

  const [revenueStats] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${appointments.paymentStatus} = 'confirmed' THEN ${appointments.paymentAmount} ELSE 0 END), 0)`,
    })
    .from(appointments)
    .where(eq(appointments.clinicId, user!.clinicId!));

  return jsonResponse({ today: todayStats, revenue: revenueStats });
}
```

**Step 3: Create staff appointments list (filterable)**

```typescript
// src/app/api/staff/appointments/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status");
  const dentistId = searchParams.get("dentistId");

  const conditions = [eq(appointments.clinicId, user!.clinicId!)];
  if (dateFrom) conditions.push(gte(appointments.date, dateFrom));
  if (dateTo) conditions.push(lte(appointments.date, dateTo));
  if (status) conditions.push(eq(appointments.status, status as any));
  if (dentistId) conditions.push(eq(appointments.dentistId, dentistId));

  // Alias for patient user vs dentist user
  const patientUser = users;

  const results = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      paymentProofUrl: appointments.paymentProofUrl,
      notes: appointments.notes,
      serviceName: services.name,
      serviceColor: services.color,
      patientFirstName: patientUser.firstName,
      patientLastName: patientUser.lastName,
      patientEmail: patientUser.email,
      patientPhone: patientUser.phone,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(patientUser, eq(appointments.patientId, patientUser.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.date));

  return jsonResponse(results);
}
```

**Step 4: Create staff appointment update endpoint** (confirm payment, change status)

```typescript
// src/app/api/staff/appointments/[id]/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const allowedFields = ["status", "paymentStatus", "notes"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const [updated] = await db.update(appointments)
    .set(updates)
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, user!.clinicId!)))
    .returning();

  if (!updated) return errorResponse("Appointment not found", 404);
  return jsonResponse(updated);
}
```

**Step 5: Create CRUD endpoints for dentists and services management**

(Follow same pattern: requireStaff guard → query by clinicId → return data. POST for create, PUT for update, DELETE for soft-delete via isActive=false.)

**Step 6: Create clinic settings update endpoint**

```typescript
// src/app/api/staff/clinic/settings/route.ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function PUT(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;
  if (user!.role !== "clinic_admin") return errorResponse("Admin access required", 403);

  const body = await req.json();
  const allowedFields = ["name", "address", "phone", "email", "primaryColor", "secondaryColor", "operatingHours", "logoUrl", "qrCodeUrl"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const [updated] = await db.update(clinics)
    .set(updates)
    .where(eq(clinics.id, user!.clinicId!))
    .returning();

  return jsonResponse(updated);
}
```

**Step 7: Create reports/analytics endpoint**

Queries: daily bookings count, revenue by period, popular services, dentist productivity, no-show rate — all filtered by clinicId.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add staff portal API with dashboard, appointment management, and clinic settings"
```

---

## Task 11: Super Admin API

**Files:**
- Create: `src/lib/middleware/require-admin.ts`
- Create: `src/app/api/admin/clinics/route.ts`
- Create: `src/app/api/admin/clinics/[id]/route.ts`
- Create: `src/app/api/admin/analytics/route.ts`
- Create: `src/app/api/admin/subscriptions/route.ts`

**Step 1: Create admin guard, clinic CRUD, platform analytics, subscription management**

Pattern: requireAdmin guard (role === super_admin) → full CRUD on clinics table → aggregated analytics across all clinics.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add super admin API for clinic and subscription management"
```

---

## Task 12: Email Notification System

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/lib/email-templates.ts`
- Create: `src/lib/queue.ts`
- Create: `src/worker.ts`

**Step 1: Create Nodemailer email sender**

```typescript
// src/lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "DentalBook <noreply@dentalbook.ph>",
    to,
    subject,
    html,
  });
}
```

**Step 2: Create email templates** (booking confirmation, reminder, payment confirmed, cancellation)

**Step 3: Create BullMQ queue + worker**

```typescript
// src/lib/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const emailQueue = new Queue("email", { connection });
export const reminderQueue = new Queue("reminder", { connection });
```

```typescript
// src/worker.ts
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendEmail } from "./lib/email";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const emailWorker = new Worker("email", async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
}, { connection });

const reminderWorker = new Worker("reminder", async (job) => {
  // Fetch appointment, check if still active, send reminder email
  const { appointmentId } = job.data;
  // ... fetch appointment + patient email, compose reminder, call sendEmail
}, { connection });

console.log("Workers started");
```

**Step 4: Schedule reminders on booking creation**

After creating an appointment in the booking endpoint, add to reminderQueue:
- 24 hours before appointment
- 2 hours before appointment

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add email notification system with BullMQ workers and Gmail SMTP"
```

---

## Task 13: Patient-Facing UI — Booking Flow

**Files:**
- Create: `src/app/(public)/page.tsx`
- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(public)/book/page.tsx`
- Create: `src/app/(public)/book/dentist/page.tsx`
- Create: `src/app/(public)/book/schedule/page.tsx`
- Create: `src/app/(public)/book/details/page.tsx`
- Create: `src/app/(public)/book/payment/page.tsx`
- Create: `src/app/(public)/book/confirmation/page.tsx`
- Create: `src/components/booking/booking-wizard.tsx`
- Create: `src/components/booking/service-card.tsx`
- Create: `src/components/booking/dentist-card.tsx`
- Create: `src/components/booking/time-slot-picker.tsx`
- Create: `src/components/booking/payment-proof-upload.tsx`
- Create: `src/components/clinic-branding-wrapper.tsx`
- Create: `src/hooks/use-clinic.ts`
- Create: `src/hooks/use-booking.ts`

**Step 1: Create clinic branding wrapper** — reads clinic from context, applies CSS custom properties for primaryColor/secondaryColor

**Step 2: Create booking store/hook** — manages booking wizard state across steps (selected service, dentist, date, time)

**Step 3: Build Step 1 — Service Selection** — grid of ServiceCards fetched from `/api/clinics/:slug/services`

**Step 4: Build Step 2 — Dentist Selection** — optional step, grid of DentistCards

**Step 5: Build Step 3 — Date + Time** — calendar date picker + TimeSlotPicker grid fetched from `/api/bookings/slots`

**Step 6: Build Step 4 — Patient Details** — form for name, phone, notes (pre-filled if logged in)

**Step 7: Build Step 5 — Payment** — display clinic QR code + PaymentProofUpload component

**Step 8: Build Step 6 — Confirmation** — success page with appointment summary

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add patient booking flow UI with 6-step wizard"
```

---

## Task 14: Patient-Facing UI — Auth Pages + Dashboard

**Files:**
- Create: `src/app/(public)/login/page.tsx`
- Create: `src/app/(public)/register/page.tsx`
- Create: `src/app/(public)/dashboard/page.tsx`
- Create: `src/app/(public)/dashboard/history/page.tsx`
- Create: `src/app/(public)/dashboard/profile/page.tsx`
- Create: `src/app/(public)/dashboard/appointments/[id]/page.tsx`
- Create: `src/components/patient/appointment-card.tsx`

**Step 1: Build login page** — email/password form → POST /api/auth/login

**Step 2: Build register page** — registration form → POST /api/auth/register

**Step 3: Build patient dashboard** — list of upcoming/past appointments using AppointmentCard

**Step 4: Build appointment detail page** — view details, reschedule, cancel

**Step 5: Build treatment history page** — list of past treatment records

**Step 6: Build profile page** — medical history form, allergies, dental concerns

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add patient auth pages and dashboard UI"
```

---

## Task 15: Staff Portal UI — Dashboard + Appointments

**Files:**
- Create: `src/app/staff/layout.tsx`
- Create: `src/app/staff/page.tsx`
- Create: `src/app/staff/appointments/page.tsx`
- Create: `src/app/staff/appointments/[id]/page.tsx`
- Create: `src/components/staff/sidebar.tsx`
- Create: `src/components/staff/stats-cards.tsx`
- Create: `src/components/staff/appointment-table.tsx`

**Step 1: Create staff layout** — sidebar navigation (Dashboard, Appointments, Calendar, Patients, Dentists, Services, Payments, Reports, Settings)

**Step 2: Build staff dashboard page** — stats cards (today's bookings, pending payments, revenue) + today's appointment list

**Step 3: Build appointments list page** — filterable table (by date range, status, dentist) with status badges + payment status

**Step 4: Build appointment detail page** — full details, confirm/reject payment proof (view uploaded image), change status

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add staff portal dashboard and appointment management UI"
```

---

## Task 16: Staff Portal UI — Calendar View

**Files:**
- Create: `src/app/staff/calendar/page.tsx`
- Create: `src/components/staff/calendar-view.tsx`
- Create: `src/components/staff/calendar-day-view.tsx`
- Create: `src/components/staff/calendar-week-view.tsx`

**Step 1: Build calendar page** — tabs for Daily/Weekly/Dentist views

**Step 2: Build day view** — time grid (9AM-5PM) with color-coded appointment blocks

**Step 3: Build week view** — 7-column grid with appointment blocks

**Step 4: Build dentist view** — columns per dentist, time rows

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add staff calendar view with daily, weekly, and dentist views"
```

---

## Task 17: Staff Portal UI — Management Pages

**Files:**
- Create: `src/app/staff/dentists/page.tsx`
- Create: `src/app/staff/dentists/[id]/page.tsx`
- Create: `src/app/staff/services/page.tsx`
- Create: `src/app/staff/patients/page.tsx`
- Create: `src/app/staff/patients/[id]/page.tsx`
- Create: `src/app/staff/payments/page.tsx`
- Create: `src/app/staff/reports/page.tsx`
- Create: `src/app/staff/settings/page.tsx`
- Create: `src/app/staff/settings/branding/page.tsx`
- Create: `src/app/staff/settings/schedule/page.tsx`
- Create: `src/app/staff/waitlist/page.tsx`

**Step 1: Build dentist management** — list, add, edit dentist profiles + working schedule config

**Step 2: Build service management** — CRUD for services (name, duration, price, color)

**Step 3: Build patient list + detail** — search patients, view treatment history, dental records

**Step 4: Build payments page** — list all payment proofs pending review, confirm/reject

**Step 5: Build reports page** — charts for daily bookings, revenue, popular services, no-show rate

**Step 6: Build settings pages** — clinic info, branding (logo/colors), operating hours, QR code upload

**Step 7: Build waitlist page** — view/manage waitlisted patients, notify when slot opens

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add staff portal management pages for dentists, services, patients, and settings"
```

---

## Task 18: Super Admin UI

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/clinics/page.tsx`
- Create: `src/app/admin/clinics/[id]/page.tsx`
- Create: `src/app/admin/subscriptions/page.tsx`
- Create: `src/app/admin/analytics/page.tsx`

**Step 1: Build admin layout** — sidebar (Overview, Clinics, Subscriptions, Analytics)

**Step 2: Build platform overview** — total clinics, active subscriptions, platform revenue

**Step 3: Build clinics management** — list all clinics, activate/deactivate, view details

**Step 4: Build clinic detail** — clinic info, subscription status, usage stats

**Step 5: Build subscriptions page** — manage tiers, payment history

**Step 6: Build analytics page** — platform-wide charts

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add super admin panel with clinic and subscription management"
```

---

## Task 19: File Upload + Static Serving

**Files:**
- Create: `src/app/api/upload/route.ts`
- Modify: `next.config.ts` (static file serving)

**Step 1: Create generic file upload endpoint** — handles logo, QR code, dental records, x-rays

**Step 2: Configure Next.js to serve `/uploads` directory as static files**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add file upload endpoint and static file serving"
```

---

## Task 20: Production Docker Compose + Deployment

**Files:**
- Create: `docker-compose.prod.yml`
- Modify: `docker-compose.yml`
- Create: `docker/nginx/nginx.prod.conf`
- Create: `scripts/deploy.sh`
- Create: `scripts/backup.sh`

**Step 1: Create production Docker Compose**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - app

  app:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://dental:${DB_PASSWORD}@postgres:5432/dentalbook
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    volumes:
      - uploads:/app/uploads

  worker:
    build: .
    command: node worker.js
    env_file:
      - .env.production
    depends_on:
      - redis
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dentalbook
      POSTGRES_USER: dental
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot

volumes:
  postgres_data:
  redis_data:
  uploads:
```

**Step 2: Create production Nginx config** with SSL + wildcard subdomain

**Step 3: Create deploy script**

```bash
#!/bin/bash
# scripts/deploy.sh
set -e
echo "Pulling latest code..."
git pull origin main
echo "Building and deploying..."
docker compose -f docker-compose.prod.yml up -d --build
echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push
echo "Deploy complete!"
```

**Step 4: Create backup script** for PostgreSQL daily backups

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add production Docker Compose, Nginx SSL, and deployment scripts"
```

---

## Task Summary

| Task | Description | Estimated Steps |
|------|-------------|----------------|
| 1 | Project scaffolding + Docker | 12 |
| 2 | Database schema (Drizzle) | 13 |
| 3 | Seed script | 4 |
| 4 | Authentication (JWT) | 9 |
| 5 | Multi-tenant middleware | 4 |
| 6 | Clinic public API | 5 |
| 7 | Booking engine — slots | 5 |
| 8 | Booking engine — create/update | 5 |
| 9 | Patient dashboard API | 3 |
| 10 | Staff portal API | 8 |
| 11 | Super admin API | 2 |
| 12 | Email notifications | 5 |
| 13 | Patient booking UI | 9 |
| 14 | Patient auth + dashboard UI | 7 |
| 15 | Staff dashboard + appointments UI | 5 |
| 16 | Staff calendar view UI | 5 |
| 17 | Staff management pages UI | 8 |
| 18 | Super admin UI | 7 |
| 19 | File upload + static serving | 3 |
| 20 | Production Docker + deployment | 5 |

**Total: 20 tasks, ~124 steps**

**Recommended execution order:** Tasks 1-12 (backend) can be built sequentially. Tasks 13-18 (frontend) can be partially parallelized. Task 19-20 at the end.
