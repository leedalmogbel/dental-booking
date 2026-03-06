import { NextRequest } from "next/server";
import { db } from "@/db";
import { treatmentRecords, appointments, dentists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createRecordSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().optional(),
  proceduresDone: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.object({
    url: z.string(),
    type: z.string(),
    name: z.string(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = createRecordSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { appointmentId, diagnosis, proceduresDone, notes, attachments } = parsed.data;

  // Verify the appointment belongs to this clinic
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.clinicId, user!.clinicId!)
      )
    )
    .limit(1);

  if (!appointment) return errorResponse("Appointment not found", 404);

  // Find the dentist record for this user (if they are a dentist)
  let dentistId = appointment.dentistId;
  if (user!.role === "dentist") {
    const [dentist] = await db
      .select()
      .from(dentists)
      .where(
        and(
          eq(dentists.userId, user!.id),
          eq(dentists.clinicId, user!.clinicId!)
        )
      )
      .limit(1);
    if (dentist) dentistId = dentist.id;
  }

  const [record] = await db
    .insert(treatmentRecords)
    .values({
      appointmentId,
      dentistId,
      patientId: appointment.patientId,
      clinicId: user!.clinicId!,
      diagnosis,
      proceduresDone,
      notes,
      attachments,
    })
    .returning();

  return jsonResponse(record, 201);
}
