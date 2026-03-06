import { db } from "@/db";
import { subscriptions, clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/require-admin";
import { jsonResponse } from "@/lib/api-utils";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db
    .select({
      id: subscriptions.id,
      tier: subscriptions.tier,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      amount: subscriptions.amount,
      createdAt: subscriptions.createdAt,
      clinicId: clinics.id,
      clinicName: clinics.name,
      clinicSlug: clinics.slug,
    })
    .from(subscriptions)
    .leftJoin(clinics, eq(subscriptions.clinicId, clinics.id));

  const result = rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    status: r.status,
    currentPeriodStart: r.currentPeriodStart,
    currentPeriodEnd: r.currentPeriodEnd,
    amount: r.amount,
    createdAt: r.createdAt,
    clinic: {
      id: r.clinicId,
      name: r.clinicName,
      slug: r.clinicSlug,
    },
  }));

  return jsonResponse(result);
}
