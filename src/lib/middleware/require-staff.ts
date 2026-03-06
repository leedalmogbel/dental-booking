import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: errorResponse("Not authenticated", 401) };
  if (!["clinic_admin", "dentist"].includes(user.role)) {
    return { user: null, error: errorResponse("Staff access required", 403) };
  }
  return { user, error: null };
}
