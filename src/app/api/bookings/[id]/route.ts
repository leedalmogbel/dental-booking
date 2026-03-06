import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appointment) return errorResponse("Appointment not found", 404);

  const [service] = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
  const [dentist] = await db.select().from(dentists).where(eq(dentists.id, appointment.dentistId)).limit(1);
  const [dentistUser] = dentist ? await db.select().from(users).where(eq(users.id, dentist.userId)).limit(1) : [null];

  return jsonResponse({
    ...appointment,
    service: service ? { name: service.name, durationMinutes: service.durationMinutes, price: service.price } : null,
    dentist: dentistUser ? { name: `Dr. ${dentistUser.firstName} ${dentistUser.lastName}`, specialization: dentist?.specialization } : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const body = await req.json();

  if (user.role === "patient") {
    const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.patientId, user.id))).limit(1);
    if (!appt) return errorResponse("Appointment not found", 404);

    if (body.status === "cancelled") {
      const [updated] = await db.update(appointments)
        .set({ status: "cancelled", cancellationReason: body.cancellationReason || "Cancelled by patient", updatedAt: new Date() })
        .where(eq(appointments.id, id))
        .returning();
      return jsonResponse(updated);
    }
  }

  if (user.role === "clinic_admin" || user.role === "dentist") {
    const [updated] = await db.update(appointments)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, user.clinicId!)))
      .returning();
    if (!updated) return errorResponse("Appointment not found", 404);
    return jsonResponse(updated);
  }

  return errorResponse("Unauthorized", 403);
}
