import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loginRedirectPath } from "@/lib/route-access";

// Pages only: API routes answer 401 themselves, and /api/auth must stay reachable for the OAuth flow.
export default auth((req) => {
  const target = loginRedirectPath(req.nextUrl.pathname, Boolean(req.auth));
  if (target) return NextResponse.redirect(new URL(target, req.nextUrl.origin));
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
