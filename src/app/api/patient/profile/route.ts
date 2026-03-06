import { NextRequest } from "next/server";
import { db } from "@/db";
import { patientProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const profileSchema = z.object({
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  medicalHistory: z.any().nullable().optional(),
  allergies: z.any().nullable().optional(),
  dentalConcerns: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const [profile] = await db
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, user.id))
    .limit(1);

  return jsonResponse(profile || null);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, user.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(patientProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patientProfiles.id, existing.id))
      .returning();
    return jsonResponse(updated);
  }

  if (!user.clinicId) return errorResponse("No clinic associated with user", 400);

  const [created] = await db
    .insert(patientProfiles)
    .values({
      userId: user.id,
      clinicId: user.clinicId,
      ...data,
    })
    .returning();

  return jsonResponse(created, 201);
}
