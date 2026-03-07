import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyOtp } from "@/lib/otp";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { otpVerifySchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { email, clinicId, code, purpose } = parsed.data;

  const valid = await verifyOtp(email, clinicId, code, purpose);
  if (!valid) return errorResponse("Invalid or expired code", 401);

  // For login: issue tokens
  if (purpose === "login") {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.clinicId, clinicId)))
      .limit(1);

    if (!user || !user.isActive) {
      return errorResponse("Account not found", 404);
    }

    const tokenPayload = { userId: user.id, clinicId: user.clinicId, role: user.role };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(tokenPayload);

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 900,
    });
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
    });

    return jsonResponse({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        clinicId: user.clinicId,
      },
    });
  }

  // For booking_verify: just confirm verification
  return jsonResponse({ verified: true });
}
