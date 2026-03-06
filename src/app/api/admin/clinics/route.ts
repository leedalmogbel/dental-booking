import { NextRequest } from "next/server";
import { db } from "@/db";
import { clinics, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/require-admin";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const createClinicSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  email: z.string().email().optional(),
  address: z.string().optional(),
  subscriptionTier: z.enum(["starter", "professional", "enterprise"]).optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      email: clinics.email,
      phone: clinics.phone,
      address: clinics.address,
      subscriptionTier: clinics.subscriptionTier,
      subscriptionStatus: clinics.subscriptionStatus,
      createdAt: clinics.createdAt,
      subTier: subscriptions.tier,
      subStatus: subscriptions.status,
      subCurrentPeriodEnd: subscriptions.currentPeriodEnd,
      subAmount: subscriptions.amount,
    })
    .from(clinics)
    .leftJoin(subscriptions, eq(clinics.id, subscriptions.clinicId));

  const result = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    email: r.email,
    phone: r.phone,
    address: r.address,
    subscriptionTier: r.subscriptionTier,
    subscriptionStatus: r.subscriptionStatus,
    createdAt: r.createdAt,
    subscription: r.subTier
      ? {
          tier: r.subTier,
          status: r.subStatus,
          currentPeriodEnd: r.subCurrentPeriodEnd,
          amount: r.subAmount,
        }
      : null,
  }));

  return jsonResponse(result);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createClinicSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { name, slug, email, address, subscriptionTier } = parsed.data;

  // Check slug uniqueness
  const [existing] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (existing) return errorResponse("Slug already in use");

  const [clinic] = await db
    .insert(clinics)
    .values({
      name,
      slug,
      email,
      address,
      subscriptionTier: subscriptionTier || "starter",
      subscriptionStatus: "trial",
    })
    .returning();

  // Create initial subscription record
  await db.insert(subscriptions).values({
    clinicId: clinic.id,
    tier: subscriptionTier || "starter",
    status: "trial",
  });

  return jsonResponse(clinic, 201);
}
