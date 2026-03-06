import { NextRequest } from "next/server";
import { db } from "@/db";
import { waitlist, users, services, dentists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createWaitlistSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  preferredDentistId: z.string().uuid().optional(),
  preferredDate: z.string().optional(),
  preferredTimeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

const updateWaitlistSchema = z.object({
  status: z.enum(["waiting", "notified", "booked", "expired"]),
});

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const patientUsers = db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
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
      id: waitlist.id,
      preferredDate: waitlist.preferredDate,
      preferredTimeRange: waitlist.preferredTimeRange,
      status: waitlist.status,
      createdAt: waitlist.createdAt,
      serviceName: services.name,
      patientFirstName: patientUsers.firstName,
      patientLastName: patientUsers.lastName,
      patientEmail: patientUsers.email,
      dentistFirstName: dentistUsers.firstName,
      dentistLastName: dentistUsers.lastName,
    })
    .from(waitlist)
    .leftJoin(services, eq(waitlist.serviceId, services.id))
    .leftJoin(patientUsers, eq(waitlist.patientId, patientUsers.id))
    .leftJoin(dentists, eq(waitlist.preferredDentistId, dentists.id))
    .leftJoin(dentistUsers, eq(dentists.userId, dentistUsers.id))
    .where(eq(waitlist.clinicId, user!.clinicId!));

  const result = rows.map((r) => ({
    id: r.id,
    preferredDate: r.preferredDate,
    preferredTimeRange: r.preferredTimeRange,
    status: r.status,
    createdAt: r.createdAt,
    service: r.serviceName || null,
    patient: r.patientFirstName
      ? { name: `${r.patientFirstName} ${r.patientLastName}`, email: r.patientEmail }
      : null,
    preferredDentist: r.dentistFirstName
      ? { name: `Dr. ${r.dentistFirstName} ${r.dentistLastName}` }
      : null,
  }));

  return jsonResponse(result);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = createWaitlistSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [entry] = await db
    .insert(waitlist)
    .values({
      clinicId: user!.clinicId!,
      ...parsed.data,
    })
    .returning();

  return jsonResponse(entry, 201);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const { id, ...rest } = body;

  if (!id) return errorResponse("Waitlist entry ID is required");

  const parsed = updateWaitlistSchema.safeParse(rest);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(waitlist)
    .set(parsed.data)
    .where(
      and(
        eq(waitlist.id, id),
        eq(waitlist.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Waitlist entry not found", 404);

  return jsonResponse(updated);
}
