import { cookies } from "next/headers";
import { verifyRefreshToken, createAccessToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) return errorResponse("No refresh token", 401);

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return errorResponse("Invalid refresh token", 401);

  const accessToken = await createAccessToken(payload);
  cookieStore.set("access_token", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900 });

  return jsonResponse({ success: true });
}
