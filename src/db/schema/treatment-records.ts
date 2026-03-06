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
