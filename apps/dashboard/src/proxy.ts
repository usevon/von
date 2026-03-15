import { type NextRequest, NextResponse } from "next/server";

const COOKIE_PREFIX = "von";
const SESSION_COOKIE = `${COOKIE_PREFIX}.session_token`;
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

function hasSessionCookie(request: NextRequest): boolean {
  const cookieStore = request.cookies;
  return (
    cookieStore.has(SESSION_COOKIE) || cookieStore.has(SECURE_SESSION_COOKIE)
  );
}

export function proxy(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    const { pathname, search } = request.nextUrl;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|auth|onboarding|favicon\\.ico|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)$).*)",
  ],
};
