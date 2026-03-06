import { NextRequest } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  price: z.string().or(z.number()).transform(String).optional(),
  requiredSpecialization: z.string().optional(),
  preInstructions: z.string().optional(),
  isActive: z.boolean().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(services)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Service not found", 404);

  return jsonResponse(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const [updated] = await db
    .update(services)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Service not found", 404);

  return jsonResponse({ message: "Service deactivated" });
}
