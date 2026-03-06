import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const today = new Date().toISOString().split("T")[0];

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${appointments.status} = 'confirmed')::int`,
      pending: sql<number>`count(*) filter (where ${appointments.status} = 'pending')::int`,
      completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, user!.clinicId!),
        eq(appointments.date, today)
      )
    );

  const [paymentStats] = await db
    .select({
      pendingPayments: sql<number>`count(*) filter (where ${appointments.paymentStatus} = 'proof_submitted')::int`,
      totalRevenue: sql<string>`coalesce(sum(${appointments.paymentAmount}) filter (where ${appointments.paymentStatus} = 'confirmed'), 0)`,
    })
    .from(appointments)
    .where(eq(appointments.clinicId, user!.clinicId!));

  return jsonResponse({
    today: {
      total: stats.total,
      confirmed: stats.confirmed,
      pending: stats.pending,
      completed: stats.completed,
    },
    pendingPayments: paymentStats.pendingPayments,
    totalRevenue: paymentStats.totalRevenue,
  });
}
