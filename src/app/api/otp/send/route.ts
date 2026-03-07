import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendOtp } from "@/lib/otp";
import { otpSendSchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = otpSendSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { email, clinicId, clinicName, purpose } = parsed.data;

  // For login purpose, only send if account exists (but don't reveal that)
  if (purpose === "login") {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.clinicId, clinicId)))
      .limit(1);

    if (!user) {
      // Return success anyway to prevent email enumeration
      return jsonResponse({ sent: true });
    }
  }

  const result = await sendOtp(email, clinicId, clinicName, purpose);

  if (!result.success) {
    return errorResponse(result.error!, 429);
  }

  return jsonResponse({ sent: true });
}
