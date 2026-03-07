import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const otpPurposeEnum = pgEnum("otp_purpose", ["booking_verify", "login"]);

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: otpPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
