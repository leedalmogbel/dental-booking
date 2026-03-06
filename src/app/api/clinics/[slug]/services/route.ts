import { NextRequest } from "next/server";
import { db } from "@/db";
import { services, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  const clinicServices = await db
    .select()
    .from(services)
    .where(and(eq(services.clinicId, clinic.id), eq(services.isActive, true)))
    .orderBy(services.sortOrder);

  return jsonResponse(clinicServices);
}
