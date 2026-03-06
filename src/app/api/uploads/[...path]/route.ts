import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = path.join(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    ...pathSegments
  );

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    return new Response(file, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
