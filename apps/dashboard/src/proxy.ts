import { COOKIE_PREFIX, getSessionCookie } from "@usevon/auth";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX });

  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next (Next.js internals)
     * - Static files (anything with an extension)
     * - api/auth (better-auth callbacks)
     * - auth (public auth pages)
     */
    "/((?!_next|api/auth|auth|onboarding|.*\\.[\\w]+$).*)",
  ],
};
