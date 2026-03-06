import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

  let clinicSlug = "";

  if (hostname === appDomain || hostname === `www.${appDomain}`) {
    clinicSlug = "";
  } else if (hostname.endsWith(`.${appDomain}`)) {
    clinicSlug = hostname.replace(`.${appDomain}`, "");
  } else {
    // Local dev: use query param as fallback
    clinicSlug = request.nextUrl.searchParams.get("clinic") || "";
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-clinic-slug", clinicSlug);

  // Protect staff routes
  if (request.nextUrl.pathname.startsWith("/staff")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
