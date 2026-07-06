import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all paths except authentication endpoints, static files, and APIs
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
