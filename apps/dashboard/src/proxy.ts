import { getSessionCookie } from "@usevon/auth";
import { type NextRequest, NextResponse } from "next/server";

import { AUTH_SESSION_PATH, COOKIE_PREFIX } from "@/lib/auth";

const hasValidSession = async (request: NextRequest): Promise<boolean> => {
  const session = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX });
  if (!session) {
    return false;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return false;
  }

  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie) {
    return false;
  }

  try {
    const response = await fetch(new URL(AUTH_SESSION_PATH, apiUrl), {
      method: "GET",
      headers: {
        cookie,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as {
      session?: { id?: string | null } | null;
    };

    return Boolean(body.session?.id);
  } catch {
    return false;
  }
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!(await hasValidSession(request))) {
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
