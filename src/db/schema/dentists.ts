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
