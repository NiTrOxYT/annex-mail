import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "@/utils/errors";
import { auditService } from "@/lib/audit/audit.service";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { ensureInitialized } from "@/lib/di/container";

const resetPasswordSchema = z.object({
  temporaryPassword: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const session = await auth();
    if (
      !session ||
      !session.user ||
      !session.user.id ||
      !session.user.organizationId
    ) {
      throw new AuthenticationError("User is not authenticated");
    }

    const userRole = session.user.role;
    if (userRole !== "OWNER" && userRole !== "ADMIN") {
      return ApiResponse.failure(
        new AuthenticationError(
          "Forbidden: only Owners and Admins can reset member passwords",
        ),
      );
    }

    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    // Fetch target member
    const member = await db.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.organizationId !== session.user.organizationId) {
      throw new NotFoundError("Member not found in organization");
    }

    // Role safety: Admins cannot reset Owner passwords
    if (member.role === Role.OWNER && userRole !== "OWNER") {
      throw new ValidationError(
        "Forbidden: Admins cannot reset passwords for Owners.",
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.parse(body);

    const passwordHash = await bcrypt.hash(parsed.temporaryPassword, 10);
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await db.user.update({
      where: { id: member.userId },
      data: {
        passwordHash,
        mustChangePassword: true, // User must reset password after logging in
      },
    });

    // Revoke target user's existing sessions
    await db.session
      .deleteMany({
        where: { userId: member.userId },
      })
      .catch((err) => console.error("Failed to revoke user sessions", err));

    await auditService.logAudit({
      action: "PASSWORD_RESET",
      message: `Reset password for member: ${member.user.email} (forced change on next login)`,
      context: {
        ipAddress,
        userAgent,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      metadata: { targetUserId: member.userId, targetEmail: member.user.email },
    });

    return ApiResponse.success({
      message: "Password reset successful. Change is forced on next login.",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
