import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_PREFIX } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const session = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX });

  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next (Next.js internals)
     * - Static files (html, css, js, images, fonts, etc.)
     * - api (API routes)
     * - auth (public auth pages)
     * - onboarding (public onboarding)
     * - favicon.ico
     */
    "/((?!_next|api|auth|onboarding|favicon\\.ico|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$).*)",
  ],
};
