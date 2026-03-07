import { cookies } from "next/headers";
import { jsonResponse } from "@/lib/api-utils";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("access_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0 });
  cookieStore.set("refresh_token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0 });
  return jsonResponse({ success: true });
}
