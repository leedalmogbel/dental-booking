import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const userRoleEnum = pgEnum("user_role", ["patient", "clinic_admin", "dentist", "super_admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash"),
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
