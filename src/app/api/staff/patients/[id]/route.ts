import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, appointments, treatmentRecords, services, dentists, patientProfiles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const [patient] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "patient")))
    .limit(1);

  if (!patient) return errorResponse("Patient not found", 404);

  const [profile] = await db
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, id))
    .limit(1);

  const patientAppointments = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      serviceName: services.name,
      dentistSpecialization: dentists.specialization,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(dentists, eq(appointments.dentistId, dentists.id))
    .where(
      and(
        eq(appointments.patientId, id),
        eq(appointments.clinicId, user!.clinicId!)
      )
    )
    .orderBy(desc(appointments.date));

  const records = await db
    .select()
    .from(treatmentRecords)
    .where(
      and(
        eq(treatmentRecords.patientId, id),
        eq(treatmentRecords.clinicId, user!.clinicId!)
      )
    )
    .orderBy(desc(treatmentRecords.createdAt));

  return jsonResponse({
    ...patient,
    profile: profile || null,
    appointments: patientAppointments,
    treatmentRecords: records,
  });
}
