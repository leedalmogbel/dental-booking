import { db } from "@/db";
import { clinics, appointments, subscriptions } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/require-admin";
import { jsonResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [clinicStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clinics);

  const [appointmentStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalRevenue: sql<string>`coalesce(sum(${appointments.paymentAmount}) filter (where ${appointments.paymentStatus} = 'confirmed'), 0)`,
    })
    .from(appointments);

  const [activeSubscriptions] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return jsonResponse({
    totalClinics: clinicStats.count,
    totalAppointments: appointmentStats.count,
    totalRevenue: appointmentStats.totalRevenue,
    activeSubscriptions: activeSubscriptions.count,
  });
}
