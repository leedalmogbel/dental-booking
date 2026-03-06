import { NextRequest } from "next/server";
import { getClinicBySlug } from "@/lib/tenant";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) return errorResponse("Clinic not found", 404);

  return jsonResponse({
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    logoUrl: clinic.logoUrl,
    primaryColor: clinic.primaryColor,
    secondaryColor: clinic.secondaryColor,
    address: clinic.address,
    phone: clinic.phone,
    email: clinic.email,
    operatingHours: clinic.operatingHours,
  });
}
