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
