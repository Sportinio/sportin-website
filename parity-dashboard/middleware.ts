import { NextRequest, NextResponse } from "next/server";

/**
 * Basic auth gate for the entire dashboard.
 *
 * Set two env vars on Vercel:
 *   BASIC_AUTH_USER   e.g. "sportin"
 *   BASIC_AUTH_PASS   long random string
 *
 * If either is unset, the gate is disabled (useful in local dev).
 * Browsers cache credentials per session, so you log in once per browser.
 */
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [u, p] = decoded.split(":");
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SportIn Parity"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
