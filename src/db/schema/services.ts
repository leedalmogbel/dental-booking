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
