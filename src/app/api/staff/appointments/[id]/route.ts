import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
    .optional(),
  paymentStatus: z
    .enum(["unpaid", "proof_submitted", "confirmed", "refunded"])
    .optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireStaff();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(appointments)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.clinicId, user!.clinicId!)
      )
    )
    .returning();

  if (!updated) return errorResponse("Appointment not found", 404);

  return jsonResponse(updated);
}
