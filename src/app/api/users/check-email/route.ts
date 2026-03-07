import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const clinicId = req.nextUrl.searchParams.get("clinicId");

  if (!email || !clinicId) return errorResponse("Missing email or clinicId");

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), eq(users.clinicId, clinicId)))
    .limit(1);

  return jsonResponse({ exists: !!user });
}
