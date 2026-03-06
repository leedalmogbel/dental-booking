import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: errorResponse("Not authenticated", 401) };
  if (user.role !== "super_admin") {
    return { user: null, error: errorResponse("Admin access required", 403) };
  }
  return { user, error: null };
}
