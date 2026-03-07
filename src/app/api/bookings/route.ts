import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, services, users, clinics } from "@/db/schema";
import { and, eq, not, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations/booking";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email";
import { bookingConfirmationEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { clinicId, serviceId, dentistId, date, startTime, notes, patientDetails } = parsed.data;

  // Resolve patient: authenticated user OR guest
  let patientId: string;
  let patientEmail: string;
  let patientName: string;

  const currentUser = await getCurrentUser();

  if (currentUser) {
    patientId = currentUser.id;
    patientEmail = currentUser.email;
    patientName = `${currentUser.firstName} ${currentUser.lastName}`;
  } else if (patientDetails) {
    const email = patientDetails.email.toLowerCase();

    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.clinicId, clinicId)))
      .limit(1);

    if (existingUser) {
      patientId = existingUser.id;
      patientEmail = existingUser.email;
      patientName = `${existingUser.firstName} ${existingUser.lastName}`;
    } else {
      const [newUser] = await db.insert(users).values({
        clinicId,
        email,
        firstName: patientDetails.firstName,
        lastName: patientDetails.lastName,
        phone: patientDetails.phone,
        role: "patient",
      }).returning();

      patientId = newUser.id;
      patientEmail = newUser.email;
      patientName = `${newUser.firstName} ${newUser.lastName}`;
    }
  } else {
    return errorResponse("Not authenticated. Please provide patient details or log in.", 401);
  }

  // Validate clinic exists
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  // Get service
  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) return errorResponse("Service not found", 404);

  // Calculate end time
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
    patientId,
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

  // Send confirmation email (non-blocking)
  try {
    const { subject, html } = bookingConfirmationEmail({
      clinicName: clinic.name,
      patientName,
      serviceName: service.name,
      dentistName: "Your dentist",
      date,
      time: `${startTime} - ${endTime}`,
      amount: `P${parseFloat(service.price).toLocaleString()}`,
      clinicAddress: clinic.address || "",
      clinicPhone: clinic.phone || "",
    });
    sendEmail(patientEmail, subject, html).catch((err) =>
      console.error("[Booking] Failed to send confirmation email:", err)
    );
  } catch (err) {
    console.error("[Booking] Email error:", err);
  }

  return jsonResponse(appointment, 201);
}
