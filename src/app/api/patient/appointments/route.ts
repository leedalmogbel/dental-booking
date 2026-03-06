import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const patientAppointments = await db
    .select({
      id: appointments.id,
      clinicId: appointments.clinicId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      notes: appointments.notes,
      cancellationReason: appointments.cancellationReason,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      createdAt: appointments.createdAt,
      serviceName: services.name,
      serviceDuration: services.durationMinutes,
      servicePrice: services.price,
      dentistSpecialization: dentists.specialization,
      dentistFirstName: users.firstName,
      dentistLastName: users.lastName,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(dentists, eq(appointments.dentistId, dentists.id))
    .leftJoin(users, eq(dentists.userId, users.id))
    .where(eq(appointments.patientId, user.id))
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  const result = patientAppointments.map((a) => ({
    id: a.id,
    clinicId: a.clinicId,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    paymentStatus: a.paymentStatus,
    paymentAmount: a.paymentAmount,
    createdAt: a.createdAt,
    service: a.serviceName
      ? { name: a.serviceName, durationMinutes: a.serviceDuration, price: a.servicePrice }
      : null,
    dentist: a.dentistFirstName
      ? {
          name: `Dr. ${a.dentistFirstName} ${a.dentistLastName}`,
          specialization: a.dentistSpecialization,
        }
      : null,
  }));

  return jsonResponse(result);
}
