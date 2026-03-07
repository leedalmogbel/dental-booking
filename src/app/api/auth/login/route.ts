import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, clinics, dentists } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { email, password } = parsed.data;

  const clinicSlug = req.headers.get("x-clinic-slug");

  let user;
  if (clinicSlug && clinicSlug !== "admin") {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, clinicSlug)).limit(1);
    if (!clinic) return errorResponse("Clinic not found", 404);
    [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.clinicId, clinic.id))).limit(1);
    // Fall back to super_admin lookup if no clinic-scoped user found
    if (!user) {
      [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.role, "super_admin"))).limit(1);
    }
  } else {
    [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.role, "super_admin"))).limit(1);
  }

  if (!user) return errorResponse("Invalid credentials", 401);
  if (!user.isActive) return errorResponse("Account deactivated", 403);

  if (!user.passwordHash) return errorResponse("This account uses passwordless login. Please use the Email Code tab.", 401);
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return errorResponse("Invalid credentials", 401);

  const tokenPayload = { userId: user.id, clinicId: user.clinicId, role: user.role };
  const accessToken = await createAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(tokenPayload);

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });
  cookieStore.set("refresh_token", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800 });

  let dentistId = null;
  if (user.role === "dentist") {
    const [dentist] = await db.select().from(dentists).where(eq(dentists.userId, user.id)).limit(1);
    dentistId = dentist?.id ?? null;
  }

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clinicId: user.clinicId,
      dentistId,
    },
  });
}
