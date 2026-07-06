import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("X-Request-ID", requestId);
  return res;
});

export const config = {
  // Protect all paths except authentication endpoints, static files, and APIs
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
