import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const clinicId = user!.clinicId!;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Daily booking counts for last 30 days
  const dailyBookings = await db
    .select({
      date: appointments.date,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        gte(appointments.date, thirtyDaysAgoStr)
      )
    )
    .groupBy(appointments.date)
    .orderBy(appointments.date);

  // Revenue by period (last 30 days)
  const [revenue] = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(${appointments.paymentAmount}) filter (where ${appointments.paymentStatus} = 'confirmed'), 0)`,
      totalAppointments: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        gte(appointments.date, thirtyDaysAgoStr)
      )
    );

  // Top services by booking count
  const topServices = await db
    .select({
      serviceName: services.name,
      bookingCount: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.clinicId, clinicId))
    .groupBy(services.name)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Dentist productivity
  const dentistProductivity = await db
    .select({
      dentistFirstName: users.firstName,
      dentistLastName: users.lastName,
      specialization: dentists.specialization,
      appointmentCount: sql<number>`count(${appointments.id})::int`,
    })
    .from(dentists)
    .leftJoin(users, eq(dentists.userId, users.id))
    .leftJoin(
      appointments,
      and(
        eq(appointments.dentistId, dentists.id),
        gte(appointments.date, thirtyDaysAgoStr)
      )
    )
    .where(eq(dentists.clinicId, clinicId))
    .groupBy(users.firstName, users.lastName, dentists.specialization);

  // No-show rate
  const [noShowStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      noShows: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        gte(appointments.date, thirtyDaysAgoStr)
      )
    );

  const noShowRate = noShowStats.total > 0
    ? ((noShowStats.noShows / noShowStats.total) * 100).toFixed(1)
    : "0.0";

  return jsonResponse({
    dailyBookings,
    revenue: {
      totalRevenue: revenue.totalRevenue,
      totalAppointments: revenue.totalAppointments,
    },
    topServices,
    dentistProductivity: dentistProductivity.map((d) => ({
      name: `Dr. ${d.dentistFirstName} ${d.dentistLastName}`,
      specialization: d.specialization,
      appointmentCount: d.appointmentCount,
    })),
    noShowRate: `${noShowRate}%`,
  });
}
