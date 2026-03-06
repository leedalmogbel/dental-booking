import { NextRequest } from "next/server";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  operatingHours: z.record(z.string(), z.object({
    start: z.string(),
    end: z.string(),
  })).optional(),
  logoUrl: z.string().optional(),
  qrCodeUrl: z.string().optional(),
});

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, user!.clinicId!))
    .limit(1);

  if (!clinic) return errorResponse("Clinic not found", 404);

  return jsonResponse(clinic);
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  if (user!.role !== "clinic_admin") {
    return errorResponse("Only clinic admins can update settings", 403);
  }

  const body = await req.json();
  const parsed = updateClinicSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(clinics)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clinics.id, user!.clinicId!))
    .returning();

  if (!updated) return errorResponse("Clinic not found", 404);

  return jsonResponse(updated);
}
