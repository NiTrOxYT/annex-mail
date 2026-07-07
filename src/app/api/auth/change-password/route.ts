import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { auditService } from "@/lib/audit/audit.service";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureInitialized } from "@/lib/di/container";

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    await ensureInitialized();
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = changePasswordSchema.parse(body);

    const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await db.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false, // Reset force change flag
      },
    });

    await auditService.logAudit({
      action: "USER_PASSWORD_CHANGED",
      message: `User ${session.user.email} changed their password.`,
      context: {
        ipAddress,
        userAgent,
        userId: session.user.id,
        organizationId: session.user.organizationId || undefined,
      },
    });

    return ApiResponse.success({
      message: "Password updated successfully.",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
