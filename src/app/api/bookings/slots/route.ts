import { NextRequest } from "next/server";
import { generateAvailableSlots } from "@/lib/booking-engine";
import { slotsQuerySchema } from "@/lib/validations/booking";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = slotsQuerySchema.safeParse(searchParams);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { clinicId, serviceId, dentistId, date } = parsed.data;
  const result = await generateAvailableSlots(clinicId, serviceId, date, dentistId);

  return jsonResponse(result);
}
