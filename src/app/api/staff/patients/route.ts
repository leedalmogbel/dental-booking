import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, appointments } from "@/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  // Get all patients who have appointments at this clinic
  const patientIds = db
    .selectDistinct({ patientId: appointments.patientId })
    .from(appointments)
    .where(eq(appointments.clinicId, user!.clinicId!));

  const conditions = [
    eq(users.role, "patient"),
    sql`${users.id} in (${patientIds})`,
  ];

  if (search) {
    conditions.push(
      or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }

  const patients = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions));

  return jsonResponse(patients);
}
