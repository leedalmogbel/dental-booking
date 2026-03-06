import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "general";

  if (!file) return errorResponse("No file uploaded");

  const allowedCategories = [
    "logos",
    "qr-codes",
    "dental-records",
    "xrays",
    "avatars",
    "payments",
    "general",
  ];
  if (!allowedCategories.includes(category))
    return errorResponse("Invalid category");

  // 10MB limit
  if (file.size > 10 * 1024 * 1024)
    return errorResponse("File too large. Maximum 10MB.");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    category
  );
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return jsonResponse({ url: `/uploads/${category}/${filename}` }, 201);
}
