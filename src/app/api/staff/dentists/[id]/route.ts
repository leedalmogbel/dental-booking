import { NextRequest } from "next/server";
import { db } from "@/db";
import { dentists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateDentistSchema = z.object({
  specialization: z.string().optional(),
  bio: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  workingHours: z.record(z.string(), z.object({
    start: z.string(),
    end: z.string(),
    breakStart: z.string().optional(),
    breakEnd: z.string().optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = updateDentistSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(dentists)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(dentists.id, id),
        eq(dentists.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Dentist not found", 404);

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
    .update(dentists)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(dentists.id, id),
        eq(dentists.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Dentist not found", 404);

  return jsonResponse({ message: "Dentist deactivated" });
}
