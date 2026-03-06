import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { clinics, users, dentists, services, dentistServices } from "./schema";
import bcrypt from "bcryptjs";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

async function seed() {
  console.log("Seeding database...");

  // Create demo clinic
  const [clinic] = await db
    .insert(clinics)
    .values({
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
    })
    .returning();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Super admin (no clinic)
  await db.insert(users).values({
    email: "admin@dentalbook.ph",
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
  });

  // Clinic admin
  await db.insert(users).values({
    clinicId: clinic.id,
    email: "admin@smileclinic.ph",
    passwordHash,
    firstName: "Maria",
    lastName: "Santos",
    role: "clinic_admin",
  });

  // Dentist users + profiles
  const [dentistUser1] = await db
    .insert(users)
    .values({
      clinicId: clinic.id,
      email: "dr.cruz@smileclinic.ph",
      passwordHash,
      firstName: "Juan",
      lastName: "Cruz",
      role: "dentist",
    })
    .returning();

  const [dentistUser2] = await db
    .insert(users)
    .values({
      clinicId: clinic.id,
      email: "dr.reyes@smileclinic.ph",
      passwordHash,
      firstName: "Ana",
      lastName: "Reyes",
      role: "dentist",
    })
    .returning();

  const [dentist1] = await db
    .insert(dentists)
    .values({
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
    })
    .returning();

  const [dentist2] = await db
    .insert(dentists)
    .values({
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
    })
    .returning();

  // Services
  const serviceData = [
    {
      name: "Dental Cleaning",
      durationMinutes: 30,
      price: "500.00",
      color: "#22C55E",
      description: "Professional teeth cleaning and polishing",
    },
    {
      name: "Tooth Extraction",
      durationMinutes: 45,
      price: "1500.00",
      color: "#EF4444",
      description: "Safe and painless tooth removal",
    },
    {
      name: "Root Canal",
      durationMinutes: 90,
      price: "5000.00",
      color: "#8B5CF6",
      description: "Root canal treatment to save damaged teeth",
    },
    {
      name: "Consultation",
      durationMinutes: 20,
      price: "300.00",
      color: "#3B82F6",
      description: "General dental consultation and check-up",
    },
    {
      name: "Orthodontic Adjustment",
      durationMinutes: 30,
      price: "1000.00",
      requiredSpecialization: "Orthodontics",
      color: "#F59E0B",
      description: "Braces adjustment and monitoring",
    },
    {
      name: "Teeth Whitening",
      durationMinutes: 60,
      price: "3000.00",
      color: "#EC4899",
      description: "Professional teeth whitening treatment",
    },
    {
      name: "Emergency Appointment",
      durationMinutes: 30,
      price: "800.00",
      color: "#DC2626",
      description: "Urgent dental care for emergencies",
    },
  ];

  const createdServices = await db
    .insert(services)
    .values(serviceData.map((s) => ({ ...s, clinicId: clinic.id })))
    .returning();

  // Link dentists to services
  const dentist1Services = createdServices.filter(
    (s) => s.requiredSpecialization !== "Orthodontics"
  );
  const dentist2Services = createdServices.filter(
    (s) => s.requiredSpecialization === "Orthodontics" || !s.requiredSpecialization
  );

  await db.insert(dentistServices).values([
    ...dentist1Services.map((s) => ({ dentistId: dentist1.id, serviceId: s.id })),
    ...dentist2Services.map((s) => ({ dentistId: dentist2.id, serviceId: s.id })),
  ]);

  // Sample patient
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

  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
