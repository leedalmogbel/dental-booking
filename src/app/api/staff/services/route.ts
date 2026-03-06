import { NextRequest } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  price: z.string().or(z.number()).transform(String),
  requiredSpecialization: z.string().optional(),
  preInstructions: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const rows = await db
    .select()
    .from(services)
    .where(eq(services.clinicId, user!.clinicId!));

  return jsonResponse(rows);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  if (user!.role !== "clinic_admin") {
    return errorResponse("Only clinic admins can create services", 403);
  }

  const body = await req.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [service] = await db
    .insert(services)
    .values({
      clinicId: user!.clinicId!,
      ...parsed.data,
    })
    .returning();

  return jsonResponse(service, 201);
}
