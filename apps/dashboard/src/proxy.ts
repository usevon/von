import { COOKIE_PREFIX, getSessionCookie } from "@usevon/auth";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX });

  if (!session) {
    return NextResponse.redirect(new URL("/test-auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/endpoints", "/webhooks", "/inbound", "/device"],
};
