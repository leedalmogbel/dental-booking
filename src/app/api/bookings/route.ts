import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { and, eq, not, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations/booking";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { clinicId, serviceId, dentistId, date, startTime, notes } = parsed.data;

  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) return errorResponse("Service not found", 404);

  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + service.durationMinutes;
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

  // Double-booking prevention
  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.dentistId, dentistId),
        eq(appointments.date, date),
        not(eq(appointments.status, "cancelled")),
        sql`${appointments.startTime} < ${endTime}::time`,
        sql`${appointments.endTime} > ${startTime}::time`
      )
    )
    .limit(1);

  if (conflicts.length > 0) {
    return errorResponse("This time slot is no longer available. Please select another.", 409);
  }

  const [appointment] = await db.insert(appointments).values({
    clinicId,
    patientId: user.id,
    dentistId,
    serviceId,
    date,
    startTime,
    endTime,
    status: "pending",
    paymentStatus: "unpaid",
    paymentAmount: service.price,
    notes,
  }).returning();

  return jsonResponse(appointment, 201);
}
