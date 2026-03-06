import { pgTable, uuid, date, decimal, timestamp } from "drizzle-orm/pg-core";
import { clinics, subscriptionTierEnum, subscriptionStatusEnum } from "./clinics";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").default("trial").notNull(),
  currentPeriodStart: date("current_period_start"),
  currentPeriodEnd: date("current_period_end"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
