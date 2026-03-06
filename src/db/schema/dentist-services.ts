import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { dentists } from "./dentists";
import { services } from "./services";

export const dentistServices = pgTable("dentist_services", {
  dentistId: uuid("dentist_id").references(() => dentists.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.dentistId, table.serviceId] }),
]);
