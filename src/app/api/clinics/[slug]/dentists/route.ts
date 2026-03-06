import { NextRequest } from "next/server";
import { db } from "@/db";
import { dentists, users, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  const clinicDentists = await db
    .select({
      id: dentists.id,
      specialization: dentists.specialization,
      bio: dentists.bio,
      photoUrl: dentists.photoUrl,
      workingDays: dentists.workingDays,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(dentists)
    .innerJoin(users, eq(dentists.userId, users.id))
    .where(and(eq(dentists.clinicId, clinic.id), eq(dentists.isActive, true)));

  return jsonResponse(clinicDentists);
}
