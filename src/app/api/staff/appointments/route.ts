import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services, dentists, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status");
  const dentistId = searchParams.get("dentistId");

  const conditions = [eq(appointments.clinicId, user!.clinicId!)];

  if (dateFrom) conditions.push(gte(appointments.date, dateFrom));
  if (dateTo) conditions.push(lte(appointments.date, dateTo));
  if (status) conditions.push(eq(appointments.status, status as "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"));
  if (dentistId) conditions.push(eq(appointments.dentistId, dentistId));

  const patientUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .as("patient_users");

  const dentistUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .as("dentist_users");

  const rows = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      notes: appointments.notes,
      paymentStatus: appointments.paymentStatus,
      paymentAmount: appointments.paymentAmount,
      paymentProofUrl: appointments.paymentProofUrl,
      createdAt: appointments.createdAt,
      serviceName: services.name,
      serviceDuration: services.durationMinutes,
      servicePrice: services.price,
      dentistSpecialization: dentists.specialization,
      dentistFirstName: dentistUsers.firstName,
      dentistLastName: dentistUsers.lastName,
      patientFirstName: patientUsers.firstName,
      patientLastName: patientUsers.lastName,
      patientEmail: patientUsers.email,
      patientPhone: patientUsers.phone,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(dentists, eq(appointments.dentistId, dentists.id))
    .leftJoin(dentistUsers, eq(dentists.userId, dentistUsers.id))
    .leftJoin(patientUsers, eq(appointments.patientId, patientUsers.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  const result = rows.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    notes: r.notes,
    paymentStatus: r.paymentStatus,
    paymentAmount: r.paymentAmount,
    paymentProofUrl: r.paymentProofUrl,
    createdAt: r.createdAt,
    service: r.serviceName
      ? { name: r.serviceName, durationMinutes: r.serviceDuration, price: r.servicePrice }
      : null,
    dentist: r.dentistFirstName
      ? { name: `Dr. ${r.dentistFirstName} ${r.dentistLastName}`, specialization: r.dentistSpecialization }
      : null,
    patient: r.patientFirstName
      ? { name: `${r.patientFirstName} ${r.patientLastName}`, email: r.patientEmail, phone: r.patientPhone }
      : null,
  }));

  return jsonResponse(result);
}
