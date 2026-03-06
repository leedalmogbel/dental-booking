import { getCurrentUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Not authenticated", 401);

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clinicId: user.clinicId,
    },
  });
}
