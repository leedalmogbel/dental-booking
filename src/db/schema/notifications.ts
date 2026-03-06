import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./users";

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").references(() => clinics.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 20 }).default("email").notNull(),
  status: notificationStatusEnum("status").default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  content: jsonb("content").$type<{ subject: string; body: string; templateData?: Record<string, string> }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
