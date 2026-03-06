import { db } from "@/db";
import { treatmentRecords, appointments, services } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const records = await db
    .select({
      id: treatmentRecords.id,
      diagnosis: treatmentRecords.diagnosis,
      proceduresDone: treatmentRecords.proceduresDone,
      notes: treatmentRecords.notes,
      attachments: treatmentRecords.attachments,
      createdAt: treatmentRecords.createdAt,
      appointmentDate: appointments.date,
      appointmentStartTime: appointments.startTime,
      serviceName: services.name,
      serviceDescription: services.description,
    })
    .from(treatmentRecords)
    .leftJoin(appointments, eq(treatmentRecords.appointmentId, appointments.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(treatmentRecords.patientId, user.id))
    .orderBy(desc(treatmentRecords.createdAt));

  return jsonResponse(records);
}
