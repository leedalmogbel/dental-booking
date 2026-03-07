import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import {
  clinics, users, dentists, services, dentistServices,
  appointments, treatmentRecords, patientProfiles, subscriptions, waitlist, notifications,
} from "./schema";
import bcrypt from "bcryptjs";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

async function seed() {
  console.log("Seeding database with full demo data...\n");

  // Clean existing data (order matters for foreign keys)
  await db.delete(waitlist);
  await db.delete(notifications);
  await db.delete(treatmentRecords);
  await db.delete(appointments);
  await db.delete(subscriptions);
  await db.delete(patientProfiles);
  await db.delete(dentistServices);
  await db.delete(dentists);
  await db.delete(services);
  await db.delete(users);
  await db.delete(clinics);
  console.log("Cleared existing data.\n");

  // ===== CLINIC 1: Smile Dental =====
  const [clinic1] = await db.insert(clinics).values({
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

  // ===== CLINIC 2: BrightSmile (second clinic for multi-tenant demo) =====
  const [clinic2] = await db.insert(clinics).values({
    name: "BrightSmile Dental Center",
    slug: "brightsmile",
    primaryColor: "#059669",
    secondaryColor: "#047857",
    address: "456 Bonifacio High Street, BGC, Taguig",
    phone: "+63 917 888 1234",
    email: "hello@brightsmile.ph",
    timezone: "Asia/Manila",
    operatingHours: {
      mon: { start: "08:00", end: "18:00" },
      tue: { start: "08:00", end: "18:00" },
      wed: { start: "08:00", end: "18:00" },
      thu: { start: "08:00", end: "18:00" },
      fri: { start: "08:00", end: "18:00" },
      sat: { start: "09:00", end: "15:00" },
    },
    subscriptionTier: "enterprise",
    subscriptionStatus: "active",
  }).returning();

  const passwordHash = await bcrypt.hash("password123", 10);

  // ===== SUPER ADMIN =====
  await db.insert(users).values({
    email: "admin@dentalbook.ph",
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
  });

  // ===== CLINIC 1 STAFF =====
  await db.insert(users).values({
    clinicId: clinic1.id,
    email: "admin@smileclinic.ph",
    passwordHash,
    firstName: "Maria",
    lastName: "Santos",
    role: "clinic_admin",
  });

  const [dentistUser1] = await db.insert(users).values({
    clinicId: clinic1.id,
    email: "dr.cruz@smileclinic.ph",
    passwordHash,
    firstName: "Juan",
    lastName: "Cruz",
    role: "dentist",
  }).returning();

  const [dentistUser2] = await db.insert(users).values({
    clinicId: clinic1.id,
    email: "dr.reyes@smileclinic.ph",
    passwordHash,
    firstName: "Ana",
    lastName: "Reyes",
    role: "dentist",
  }).returning();

  const [dentist1] = await db.insert(dentists).values({
    userId: dentistUser1.id,
    clinicId: clinic1.id,
    specialization: "General Dentistry",
    bio: "10 years of experience in general dentistry. Expert in restorative procedures and preventive care.",
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
    clinicId: clinic1.id,
    specialization: "Orthodontics",
    bio: "Specialist in braces, Invisalign, and teeth alignment. 8 years of experience.",
    workingDays: ["mon", "wed", "fri"],
    workingHours: {
      mon: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      wed: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      fri: { start: "10:00", end: "18:00", breakStart: "13:00", breakEnd: "14:00" },
    },
  }).returning();

  // ===== CLINIC 2 STAFF =====
  await db.insert(users).values({
    clinicId: clinic2.id,
    email: "admin@brightsmile.ph",
    passwordHash,
    firstName: "Carlo",
    lastName: "Mendoza",
    role: "clinic_admin",
  });

  const [dentistUser3] = await db.insert(users).values({
    clinicId: clinic2.id,
    email: "dr.garcia@brightsmile.ph",
    passwordHash,
    firstName: "Sofia",
    lastName: "Garcia",
    role: "dentist",
  }).returning();

  const [dentist3] = await db.insert(dentists).values({
    userId: dentistUser3.id,
    clinicId: clinic2.id,
    specialization: "Cosmetic Dentistry",
    bio: "Expert in veneers, bonding, and smile makeovers.",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    workingHours: {
      mon: { start: "08:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
      tue: { start: "08:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
      wed: { start: "08:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
      thu: { start: "08:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
      fri: { start: "08:00", end: "18:00", breakStart: "12:00", breakEnd: "13:00" },
      sat: { start: "09:00", end: "15:00", breakStart: "12:00", breakEnd: "13:00" },
    },
  }).returning();

  // ===== SERVICES — CLINIC 1 =====
  const serviceData1 = [
    { name: "Dental Cleaning", durationMinutes: 30, price: "500.00", color: "#22C55E", description: "Professional teeth cleaning and polishing", preInstructions: "Please brush your teeth before the appointment." },
    { name: "Tooth Extraction", durationMinutes: 45, price: "1500.00", color: "#EF4444", description: "Safe and painless tooth removal", preInstructions: "Do not eat 2 hours before the procedure. Inform us of any medications." },
    { name: "Root Canal", durationMinutes: 90, price: "5000.00", color: "#8B5CF6", description: "Root canal treatment to save damaged teeth", preInstructions: "Take prescribed antibiotics if provided. Avoid hard food before the visit." },
    { name: "Consultation", durationMinutes: 20, price: "300.00", color: "#3B82F6", description: "General dental consultation and check-up" },
    { name: "Orthodontic Adjustment", durationMinutes: 30, price: "1000.00", requiredSpecialization: "Orthodontics", color: "#F59E0B", description: "Braces adjustment and monitoring" },
    { name: "Teeth Whitening", durationMinutes: 60, price: "3000.00", color: "#EC4899", description: "Professional teeth whitening treatment", preInstructions: "Avoid coffee, tea, and dark-colored food 24 hours before." },
    { name: "Emergency Appointment", durationMinutes: 30, price: "800.00", color: "#DC2626", description: "Urgent dental care for emergencies" },
  ];

  const createdServices1 = await db.insert(services)
    .values(serviceData1.map((s) => ({ ...s, clinicId: clinic1.id })))
    .returning();

  const d1Services = createdServices1.filter((s) => s.requiredSpecialization !== "Orthodontics");
  const d2Services = createdServices1.filter((s) => s.requiredSpecialization === "Orthodontics" || !s.requiredSpecialization);

  await db.insert(dentistServices).values([
    ...d1Services.map((s) => ({ dentistId: dentist1.id, serviceId: s.id })),
    ...d2Services.map((s) => ({ dentistId: dentist2.id, serviceId: s.id })),
  ]);

  // ===== SERVICES — CLINIC 2 =====
  const serviceData2 = [
    { name: "Dental Cleaning", durationMinutes: 30, price: "600.00", color: "#22C55E", description: "Premium teeth cleaning and polishing" },
    { name: "Teeth Whitening", durationMinutes: 60, price: "3500.00", color: "#EC4899", description: "Advanced whitening treatment" },
    { name: "Veneers Consultation", durationMinutes: 45, price: "500.00", color: "#6366F1", description: "Consult for porcelain veneers" },
    { name: "Consultation", durationMinutes: 20, price: "400.00", color: "#3B82F6", description: "General dental consultation" },
  ];

  const createdServices2 = await db.insert(services)
    .values(serviceData2.map((s) => ({ ...s, clinicId: clinic2.id })))
    .returning();

  await db.insert(dentistServices).values(
    createdServices2.map((s) => ({ dentistId: dentist3.id, serviceId: s.id }))
  );

  // ===== PATIENTS — CLINIC 1 (5 patients) =====
  const patientNames = [
    { firstName: "Pedro", lastName: "Dela Cruz", email: "patient@example.com", phone: "+63 918 111 2222" },
    { firstName: "Angela", lastName: "Lim", email: "angela.lim@gmail.com", phone: "+63 917 333 4444" },
    { firstName: "Mark", lastName: "Villanueva", email: "mark.v@gmail.com", phone: "+63 919 555 6666" },
    { firstName: "Joy", lastName: "Ramos", email: "joy.ramos@yahoo.com", phone: "+63 916 777 8888" },
    { firstName: "Carlo", lastName: "Bautista", email: "carlo.b@gmail.com", phone: "+63 920 999 0000" },
  ];

  const patients1 = [];
  for (const p of patientNames) {
    const [patient] = await db.insert(users).values({
      clinicId: clinic1.id,
      email: p.email,
      passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      role: "patient",
    }).returning();
    patients1.push(patient);
  }

  // ===== PATIENT PROFILES =====
  await db.insert(patientProfiles).values([
    {
      userId: patients1[0].id,
      clinicId: clinic1.id,
      dateOfBirth: "1990-05-15",
      gender: "male",
      address: "456 Ayala Ave, Makati City",
      medicalHistory: ["Hypertension", "Diabetes Type 2"],
      allergies: ["Penicillin"],
      dentalConcerns: "Sensitive teeth, occasional gum bleeding",
      emergencyContactName: "Rosa Dela Cruz",
      emergencyContactPhone: "+63 918 222 3333",
    },
    {
      userId: patients1[1].id,
      clinicId: clinic1.id,
      dateOfBirth: "1995-11-22",
      gender: "female",
      address: "789 Paseo de Roxas, Makati City",
      medicalHistory: ["Asthma"],
      allergies: [],
      dentalConcerns: "Wants teeth whitening, slight crowding on lower teeth",
      emergencyContactName: "David Lim",
      emergencyContactPhone: "+63 917 444 5555",
    },
    {
      userId: patients1[2].id,
      clinicId: clinic1.id,
      dateOfBirth: "1988-03-10",
      gender: "male",
      address: "12 Jupiter St, Mandaluyong",
      medicalHistory: [],
      allergies: ["Latex"],
      dentalConcerns: "Wisdom tooth pain",
    },
  ]);

  // ===== PATIENTS — CLINIC 2 (2 patients) =====
  const [patient2a] = await db.insert(users).values({
    clinicId: clinic2.id,
    email: "james.tan@gmail.com",
    passwordHash,
    firstName: "James",
    lastName: "Tan",
    phone: "+63 921 123 4567",
    role: "patient",
  }).returning();

  await db.insert(users).values({
    clinicId: clinic2.id,
    email: "nina.santos@gmail.com",
    passwordHash,
    firstName: "Nina",
    lastName: "Santos",
    phone: "+63 922 765 4321",
    role: "patient",
  });

  // ===== GUEST PATIENT (no password) — CLINIC 1 =====
  await db.insert(users).values({
    clinicId: clinic1.id,
    email: "guest.patient@gmail.com",
    firstName: "Guest",
    lastName: "Patient",
    phone: "+63 999 000 1111",
    role: "patient",
  }).onConflictDoNothing();

  // ===== APPOINTMENTS — CLINIC 1 =====
  const today = new Date();
  const cleaning = createdServices1.find((s) => s.name === "Dental Cleaning")!;
  const extraction = createdServices1.find((s) => s.name === "Tooth Extraction")!;
  const rootCanal = createdServices1.find((s) => s.name === "Root Canal")!;
  const consultation = createdServices1.find((s) => s.name === "Consultation")!;
  const whitening = createdServices1.find((s) => s.name === "Teeth Whitening")!;
  const orthoAdj = createdServices1.find((s) => s.name === "Orthodontic Adjustment")!;
  const emergency = createdServices1.find((s) => s.name === "Emergency Appointment")!;

  // Past appointments (completed, with treatment records)
  const pastAppointments = [
    { patient: patients1[0], dentist: dentist1, service: cleaning, daysAgo: 30, time: "09:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[0], dentist: dentist1, service: consultation, daysAgo: 45, time: "10:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[1], dentist: dentist1, service: whitening, daysAgo: 20, time: "14:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[1], dentist: dentist2, service: orthoAdj, daysAgo: 14, time: "10:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[2], dentist: dentist1, service: extraction, daysAgo: 10, time: "09:30", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[3], dentist: dentist1, service: consultation, daysAgo: 7, time: "11:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[4], dentist: dentist1, service: cleaning, daysAgo: 5, time: "15:00", status: "completed" as const, paymentStatus: "confirmed" as const },
    // A no-show
    { patient: patients1[3], dentist: dentist1, service: cleaning, daysAgo: 3, time: "10:00", status: "no_show" as const, paymentStatus: "unpaid" as const },
    // A cancelled
    { patient: patients1[4], dentist: dentist2, service: orthoAdj, daysAgo: 2, time: "10:30", status: "cancelled" as const, paymentStatus: "unpaid" as const },
  ];

  const createdPastAppts = [];
  for (const a of pastAppointments) {
    const date = formatDate(addDays(today, -a.daysAgo));
    const endTime = addMinutesToTime(a.time, a.service.durationMinutes);
    const [appt] = await db.insert(appointments).values({
      clinicId: clinic1.id,
      patientId: a.patient.id,
      dentistId: a.dentist.id,
      serviceId: a.service.id,
      date,
      startTime: a.time,
      endTime,
      status: a.status,
      paymentStatus: a.paymentStatus,
      paymentAmount: a.service.price,
      cancellationReason: a.status === "cancelled" ? "Schedule conflict" : undefined,
    }).returning();
    createdPastAppts.push(appt);
  }

  // Today's appointments
  const todayStr = formatDate(today);
  const todayAppts = [
    { patient: patients1[0], dentist: dentist1, service: cleaning, time: "09:00", status: "confirmed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[1], dentist: dentist1, service: consultation, time: "10:00", status: "confirmed" as const, paymentStatus: "proof_submitted" as const },
    { patient: patients1[2], dentist: dentist1, service: rootCanal, time: "14:00", status: "pending" as const, paymentStatus: "unpaid" as const },
  ];

  for (const a of todayAppts) {
    const endTime = addMinutesToTime(a.time, a.service.durationMinutes);
    await db.insert(appointments).values({
      clinicId: clinic1.id,
      patientId: a.patient.id,
      dentistId: a.dentist.id,
      serviceId: a.service.id,
      date: todayStr,
      startTime: a.time,
      endTime,
      status: a.status,
      paymentStatus: a.paymentStatus,
      paymentAmount: a.service.price,
    });
  }

  // Upcoming appointments (next 7 days)
  const upcomingAppts = [
    { patient: patients1[3], dentist: dentist1, service: cleaning, daysFromNow: 1, time: "09:30", status: "confirmed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[0], dentist: dentist1, service: extraction, daysFromNow: 2, time: "11:00", status: "pending" as const, paymentStatus: "proof_submitted" as const },
    { patient: patients1[1], dentist: dentist2, service: orthoAdj, daysFromNow: 3, time: "10:30", status: "confirmed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[4], dentist: dentist1, service: whitening, daysFromNow: 4, time: "14:00", status: "pending" as const, paymentStatus: "unpaid" as const },
    { patient: patients1[2], dentist: dentist1, service: consultation, daysFromNow: 5, time: "09:00", status: "confirmed" as const, paymentStatus: "confirmed" as const },
    { patient: patients1[3], dentist: dentist1, service: emergency, daysFromNow: 1, time: "15:00", status: "pending" as const, paymentStatus: "unpaid" as const },
  ];

  for (const a of upcomingAppts) {
    const date = formatDate(addDays(today, a.daysFromNow));
    const endTime = addMinutesToTime(a.time, a.service.durationMinutes);
    await db.insert(appointments).values({
      clinicId: clinic1.id,
      patientId: a.patient.id,
      dentistId: a.dentist.id,
      serviceId: a.service.id,
      date,
      startTime: a.time,
      endTime,
      status: a.status,
      paymentStatus: a.paymentStatus,
      paymentAmount: a.service.price,
    });
  }

  // ===== CLINIC 2 APPOINTMENTS =====
  const c2cleaning = createdServices2.find((s) => s.name === "Dental Cleaning")!;
  await db.insert(appointments).values({
    clinicId: clinic2.id,
    patientId: patient2a.id,
    dentistId: dentist3.id,
    serviceId: c2cleaning.id,
    date: formatDate(addDays(today, 1)),
    startTime: "10:00",
    endTime: "10:30",
    status: "confirmed",
    paymentStatus: "confirmed",
    paymentAmount: c2cleaning.price,
  });

  // ===== TREATMENT RECORDS =====
  const completedAppts = createdPastAppts.filter((a) => a.status === "completed");
  const treatmentData = [
    { appt: completedAppts[0], diagnosis: "Mild plaque buildup, slight gingivitis", procedures: "Full mouth scaling and polishing", notes: "Advised patient to floss daily. Schedule follow-up in 6 months." },
    { appt: completedAppts[1], diagnosis: "General check-up. No cavities detected.", procedures: "Visual examination, X-ray review", notes: "Teeth in good condition. Recommended whitening." },
    { appt: completedAppts[2], diagnosis: "Mild discoloration, coffee stains", procedures: "Professional teeth whitening (1 hour session)", notes: "Patient satisfied with results. Advised to avoid dark beverages for 48 hours." },
    { appt: completedAppts[3], diagnosis: "Braces adjustment needed — lower arch wire", procedures: "Wire replacement, bracket adjustment on teeth #20, #21", notes: "Good progress. Next adjustment in 4 weeks." },
    { appt: completedAppts[4], diagnosis: "Impacted wisdom tooth (lower right #32)", procedures: "Surgical extraction under local anesthesia", notes: "Prescribed Amoxicillin 500mg TID x 5 days, Mefenamic Acid for pain. Follow up in 1 week." },
    { appt: completedAppts[5], diagnosis: "Tooth sensitivity, no visible decay", procedures: "Full oral examination, periapical X-ray", notes: "Sensitivity likely due to enamel wear. Recommended sensitivity toothpaste." },
    { appt: completedAppts[6], diagnosis: "Moderate tartar buildup", procedures: "Scaling, polishing, fluoride application", notes: "Patient has good oral hygiene overall. Next cleaning in 6 months." },
  ];

  for (const t of treatmentData) {
    await db.insert(treatmentRecords).values({
      appointmentId: t.appt.id,
      dentistId: t.appt.dentistId,
      patientId: t.appt.patientId,
      clinicId: clinic1.id,
      diagnosis: t.diagnosis,
      proceduresDone: t.procedures,
      notes: t.notes,
    });
  }

  // ===== WAITLIST =====
  await db.insert(waitlist).values([
    {
      clinicId: clinic1.id,
      patientId: patients1[3].id,
      serviceId: whitening.id,
      preferredDate: formatDate(addDays(today, 2)),
      preferredTimeRange: { start: "09:00", end: "12:00" },
      status: "waiting",
    },
    {
      clinicId: clinic1.id,
      patientId: patients1[4].id,
      serviceId: rootCanal.id,
      preferredDentistId: dentist1.id,
      preferredDate: formatDate(addDays(today, 3)),
      preferredTimeRange: { start: "14:00", end: "17:00" },
      status: "waiting",
    },
  ]);

  // ===== SUBSCRIPTIONS =====
  await db.insert(subscriptions).values([
    {
      clinicId: clinic1.id,
      tier: "professional",
      status: "active",
      currentPeriodStart: formatDate(addDays(today, -15)),
      currentPeriodEnd: formatDate(addDays(today, 15)),
      amount: "3500.00",
    },
    {
      clinicId: clinic2.id,
      tier: "enterprise",
      status: "active",
      currentPeriodStart: formatDate(addDays(today, -10)),
      currentPeriodEnd: formatDate(addDays(today, 20)),
      amount: "7000.00",
    },
  ]);

  // ===== SUMMARY =====
  console.log("=== Seed Complete! ===\n");
  console.log("CLINICS:");
  console.log("  1. Smile Dental Clinic  → smile-dental  (Professional)");
  console.log("  2. BrightSmile Dental   → brightsmile   (Enterprise)\n");
  console.log("LOGINS (all passwords: password123):");
  console.log("  Super Admin     : admin@dentalbook.ph");
  console.log("  ─── Smile Dental ───");
  console.log("  Clinic Admin    : admin@smileclinic.ph");
  console.log("  Dentist (General): dr.cruz@smileclinic.ph");
  console.log("  Dentist (Ortho) : dr.reyes@smileclinic.ph");
  console.log("  Patient         : patient@example.com");
  console.log("  Patient         : angela.lim@gmail.com");
  console.log("  Patient         : mark.v@gmail.com");
  console.log("  Patient         : joy.ramos@yahoo.com");
  console.log("  Patient         : carlo.b@gmail.com");
  console.log("  Guest (no pwd)  : guest.patient@gmail.com");
  console.log("  ─── BrightSmile ───");
  console.log("  Clinic Admin    : admin@brightsmile.ph");
  console.log("  Dentist         : dr.garcia@brightsmile.ph");
  console.log("  Patient         : james.tan@gmail.com");
  console.log("  Patient         : nina.santos@gmail.com\n");
  console.log("DEMO DATA:");
  console.log("  9 past appointments (7 completed, 1 no-show, 1 cancelled)");
  console.log("  3 today appointments");
  console.log("  6 upcoming appointments (next 5 days)");
  console.log("  7 treatment records with diagnosis/procedures");
  console.log("  3 patient profiles with medical history");
  console.log("  2 waitlist entries");
  console.log("  2 subscription records\n");
  console.log("ACCESS:");
  console.log("  Patient booking: http://localhost:3000?clinic=smile-dental");
  console.log("  Staff portal:    http://localhost:3000/staff?clinic=smile-dental");
  console.log("  Super admin:     http://localhost:3000/admin");
  console.log("  Clinic 2:        http://localhost:3000?clinic=brightsmile");

  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
