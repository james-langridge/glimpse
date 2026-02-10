import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions, getSessionVersion } from "@/src/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRedirect = pathname === "/" || pathname === "/login";

  if (isPublicRedirect && !request.cookies.has(sessionOptions.cookieName)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );

  const versionValid =
    (session.sessionVersion ?? 1) === getSessionVersion();

  if (isPublicRedirect) {
    if (session.isLoggedIn && versionValid) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  if (!session.isLoggedIn || !versionValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/api/photos",
    "/api/photos/:path*",
    "/api/links",
    "/api/links/:path*",
    "/api/analytics",
    "/api/settings",
  ],
};
