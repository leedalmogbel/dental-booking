import { NextRequest } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const [appt] = await db.select().from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.patientId, user.id)))
    .limit(1);
  if (!appt) return errorResponse("Appointment not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return errorResponse("No file uploaded");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "payments");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${id}-${Date.now()}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  const [updated] = await db.update(appointments)
    .set({
      paymentProofUrl: `/uploads/payments/${filename}`,
      paymentStatus: "proof_submitted",
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id))
    .returning();

  return jsonResponse(updated);
}
