import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
      organizationId: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
    organizationId?: string | null;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "OWNER" | "ADMIN" | "EMPLOYEE" | "READONLY";
    organizationId?: string | null;
    mustChangePassword?: boolean;
  }
}
