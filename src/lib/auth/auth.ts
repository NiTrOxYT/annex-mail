import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { UserService } from "@/services/user.service";
import { logger } from "@/lib/logger/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const userService = new UserService();

          try {
            const user = await userService.validateCredentials(email, password);
            if (!user) {
              logger.audit(
                "LOGIN_FAILED",
                "UNKNOWN",
                `Invalid credentials login attempt for: ${email}`,
              );
              return null;
            }

            const memberships = user.memberships || [];
            const primaryMembership = memberships[0];

            logger.audit("LOGIN_SUCCESS", user.id, `User logged in: ${email}`);

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: primaryMembership?.role || "EMPLOYEE",
              organizationId: primaryMembership?.organizationId || null,
            };
          } catch (error) {
            logger.error(`Error during authorization: ${error}`, "Auth");
            return null;
          }
        }

        return null;
      },
    }),
  ],
});
