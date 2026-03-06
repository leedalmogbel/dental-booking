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
