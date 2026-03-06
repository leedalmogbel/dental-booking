import { headers } from "next/headers";
import { getClinicBySlug } from "./tenant";

export async function getClinicFromRequest() {
  const headersList = await headers();
  const slug = headersList.get("x-clinic-slug");
  if (!slug) return null;
  return getClinicBySlug(slug);
}
