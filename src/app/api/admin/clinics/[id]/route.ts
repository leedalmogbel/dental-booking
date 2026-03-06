import { NextRequest } from "next/server";
import { db } from "@/db";
import { clinics, users, appointments, subscriptions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/require-admin";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const updateClinicSchema = z.object({
  subscriptionTier: z.enum(["starter", "professional", "enterprise"]).optional(),
  subscriptionStatus: z.enum(["active", "past_due", "cancelled", "trial"]).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, id))
    .limit(1);

  if (!clinic) return errorResponse("Clinic not found", 404);

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.clinicId, id));

  const [appointmentStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${appointments.paymentAmount}) filter (where ${appointments.paymentStatus} = 'confirmed'), 0)`,
    })
    .from(appointments)
    .where(eq(appointments.clinicId, id));

  return jsonResponse({
    ...clinic,
    stats: {
      userCount: userCount.count,
      appointmentCount: appointmentStats.count,
      revenue: appointmentStats.revenue,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = updateClinicSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const [updated] = await db
    .update(clinics)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clinics.id, id))
    .returning();

  if (!updated) return errorResponse("Clinic not found", 404);

  // If subscription tier/status changed, update the subscription record too
  if (parsed.data.subscriptionTier || parsed.data.subscriptionStatus) {
    const subUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.subscriptionTier) subUpdate.tier = parsed.data.subscriptionTier;
    if (parsed.data.subscriptionStatus) subUpdate.status = parsed.data.subscriptionStatus;

    await db
      .update(subscriptions)
      .set(subUpdate)
      .where(eq(subscriptions.clinicId, id));
  }

  return jsonResponse(updated);
}
