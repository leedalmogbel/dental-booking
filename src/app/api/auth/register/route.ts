import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, clinics } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { email, password, firstName, lastName, phone, clinicSlug } = parsed.data;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, clinicSlug)).limit(1);
  if (!clinic) return errorResponse("Clinic not found", 404);

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.clinicId, clinic.id)))
    .limit(1);
  if (existing) return errorResponse("Email already registered");

  const passwordHash = await hashPassword(password);

  const [user] = await db.insert(users).values({
    clinicId: clinic.id,
    email,
    passwordHash,
    firstName,
    lastName,
    phone,
    role: "patient",
  }).returning();

  const tokenPayload = { userId: user.id, clinicId: clinic.id, role: user.role };
  const accessToken = await createAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(tokenPayload);

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });
  cookieStore.set("refresh_token", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800 });

  return jsonResponse({
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  }, 201);
}
