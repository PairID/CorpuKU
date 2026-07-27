import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "corpuku_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/instructor/:path*",
    "/learn/:path*",
    "/settings/:path*",
  ],
};
