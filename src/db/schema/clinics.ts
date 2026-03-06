import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["starter", "professional", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "cancelled", "trial"]);

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#2563EB"),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#1E40AF"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Manila"),
  operatingHours: jsonb("operating_hours").$type<Record<string, { start: string; end: string }>>(),
  qrCodeUrl: text("qr_code_url"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("starter"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
