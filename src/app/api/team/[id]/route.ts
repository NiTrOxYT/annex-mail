import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "@/utils/errors";
import { auditService } from "@/lib/audit/audit.service";
import { Role } from "@prisma/client";
import { z } from "zod";
import { ensureInitialized } from "@/lib/di/container";

const updateMemberSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "EMPLOYEE"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  avatar: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
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
          "Forbidden: only Owners and Admins can edit team members",
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

    const body = await req.json();
    const parsed = updateMemberSchema.parse(body);

    const targetRole =
      parsed.role === "MEMBER"
        ? Role.EMPLOYEE
        : parsed.role
          ? (parsed.role as Role)
          : undefined;

    // Last Owner checks
    const isTargetOwner = member.role === Role.OWNER;
    const isDowngradingOwner =
      targetRole && targetRole !== Role.OWNER && isTargetOwner;
    const isDisablingOwner = parsed.status === "DISABLED" && isTargetOwner;

    if (isDowngradingOwner || isDisablingOwner) {
      const activeOwnersCount = await db.member.count({
        where: {
          organizationId: session.user.organizationId,
          role: Role.OWNER,
          status: "ACTIVE",
        },
      });

      if (activeOwnersCount <= 1) {
        throw new ValidationError(
          "Forbidden: Cannot downgrade or disable the last active Owner of the organization.",
        );
      }
    }

    // Role promotion permissions
    if (targetRole === Role.OWNER && userRole !== "OWNER") {
      throw new ValidationError(
        "Forbidden: Only Owners can promote members to Owner.",
      );
    }
    if (isTargetOwner && userRole !== "OWNER") {
      throw new ValidationError(
        "Forbidden: Only Owners can modify another Owner.",
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await db.$transaction(async (tx) => {
      // Update User
      const updatedUser = await tx.user.update({
        where: { id: member.userId },
        data: {
          ...(parsed.name && { name: parsed.name }),
          ...(parsed.avatar !== undefined && { avatar: parsed.avatar }),
          ...(targetRole && { role: targetRole }),
          ...(parsed.status && { status: parsed.status }),
        },
      });

      // Update Member
      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: {
          ...(targetRole && { role: targetRole }),
          ...(parsed.status && { status: parsed.status }),
        },
      });

      // Revoke sessions if disabled
      if (parsed.status === "DISABLED") {
        await tx.session.deleteMany({
          where: { userId: member.userId },
        });
      }

      return { updatedUser, updatedMember };
    });

    // Logging audit events
    if (parsed.status === "DISABLED") {
      await auditService.logAudit({
        action: "MEMBER_DISABLED",
        message: `Disabled member account: ${member.user.email}`,
        context: {
          ipAddress,
          userAgent,
          userId: session.user.id,
          organizationId: session.user.organizationId,
        },
        metadata: {
          targetUserId: member.userId,
          targetEmail: member.user.email,
        },
      });
    }

    if (targetRole && targetRole !== member.role) {
      await auditService.logAudit({
        action: "ROLE_CHANGED",
        message: `Changed role of ${member.user.email} from ${member.role} to ${targetRole}`,
        context: {
          ipAddress,
          userAgent,
          userId: session.user.id,
          organizationId: session.user.organizationId,
        },
        metadata: {
          targetUserId: member.userId,
          targetEmail: member.user.email,
          previousRole: member.role,
          newRole: targetRole,
        },
      });
    }

    await auditService.logAudit({
      action: "MEMBER_EDITED",
      message: `Updated member profile details: ${member.user.email}`,
      context: {
        ipAddress,
        userAgent,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      metadata: { targetUserId: member.userId, targetEmail: member.user.email },
    });

    return ApiResponse.success({
      id: result.updatedMember.id,
      name: result.updatedUser.name,
      role: parsed.role,
      status: result.updatedMember.status,
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
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
          "Forbidden: only Owners and Admins can delete members",
        ),
      );
    }

    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    const member = await db.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.organizationId !== session.user.organizationId) {
      throw new NotFoundError("Member not found in organization");
    }

    // Last Owner check
    if (member.role === Role.OWNER) {
      const activeOwnersCount = await db.member.count({
        where: {
          organizationId: session.user.organizationId,
          role: Role.OWNER,
          status: "ACTIVE",
        },
      });

      if (activeOwnersCount <= 1) {
        throw new ValidationError(
          "Forbidden: Cannot delete the last active Owner of the organization.",
        );
      }

      if (userRole !== "OWNER") {
        throw new ValidationError("Forbidden: Admins cannot delete Owners.");
      }
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Delete User and Member cascades
    await db.$transaction(async (tx) => {
      await tx.member.delete({ where: { id: memberId } });
      await tx.user.delete({ where: { id: member.userId } });
    });

    await auditService.logAudit({
      action: "MEMBER_DELETED",
      message: `Deleted member account: ${member.user.email}`,
      context: {
        ipAddress,
        userAgent,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      metadata: { targetUserId: member.userId, targetEmail: member.user.email },
    });

    return ApiResponse.success({
      id: memberId,
      message: "Member deleted successfully",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
