import { db } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getClinicBySlug = cache(async (slug: string) => {
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  return clinic ?? null;
});
