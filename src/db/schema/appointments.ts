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
