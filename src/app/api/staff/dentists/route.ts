import { NextRequest } from "next/server";
import { db } from "@/db";
import { dentists, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/middleware/require-staff";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const createDentistSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  workingHours: z.record(z.string(), z.object({
    start: z.string(),
    end: z.string(),
    breakStart: z.string().optional(),
    breakEnd: z.string().optional(),
  })).optional(),
});

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;

  const rows = await db
    .select({
      id: dentists.id,
      specialization: dentists.specialization,
      bio: dentists.bio,
      photoUrl: dentists.photoUrl,
      workingHours: dentists.workingHours,
      workingDays: dentists.workingDays,
      isActive: dentists.isActive,
      createdAt: dentists.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
    })
    .from(dentists)
    .leftJoin(users, eq(dentists.userId, users.id))
    .where(eq(dentists.clinicId, user!.clinicId!));

  const result = rows.map((r) => ({
    id: r.id,
    name: `Dr. ${r.firstName} ${r.lastName}`,
    email: r.email,
    phone: r.phone,
    specialization: r.specialization,
    bio: r.bio,
    photoUrl: r.photoUrl,
    workingHours: r.workingHours,
    workingDays: r.workingDays,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));

  return jsonResponse(result);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireStaff();
  if (error) return error;

  if (user!.role !== "clinic_admin") {
    return errorResponse("Only clinic admins can add dentists", 403);
  }

  const body = await req.json();
  const parsed = createDentistSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

  const { email, password, firstName, lastName, specialization, bio, workingDays, workingHours } = parsed.data;

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      clinicId: user!.clinicId!,
      email,
      passwordHash,
      firstName,
      lastName,
      role: "dentist",
    })
    .returning();

  const [dentist] = await db
    .insert(dentists)
    .values({
      userId: newUser.id,
      clinicId: user!.clinicId!,
      specialization,
      bio,
      workingDays,
      workingHours,
    })
    .returning();

  return jsonResponse(
    {
      ...dentist,
      name: `Dr. ${firstName} ${lastName}`,
      email,
    },
    201
  );
}
