import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

  let clinicSlug = "";

  if (hostname === appDomain || hostname === `www.${appDomain}`) {
    clinicSlug = "";
  } else if (hostname.endsWith(`.${appDomain}`)) {
    clinicSlug = hostname.replace(`.${appDomain}`, "");
  } else {
    clinicSlug = request.nextUrl.searchParams.get("clinic") || "";
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clinic-slug", clinicSlug);

  // Protect staff and admin routes
  const isProtected =
    request.nextUrl.pathname.startsWith("/staff") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (isProtected) {
    const token = request.cookies.get("access_token")?.value;
    if (!token || !(await isValidToken(token))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
