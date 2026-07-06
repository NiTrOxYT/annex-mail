import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
    organizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
    organizationId?: string | null;
  }
}
