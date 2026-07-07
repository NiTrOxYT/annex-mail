import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, ValidationError } from "@/utils/errors";
import { auditService } from "@/lib/audit/audit.service";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { ensureInitialized } from "@/lib/di/container";

const createMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "EMPLOYEE"]),
  forcePasswordChange: z.boolean().default(false),
});

export async function GET(req: Request) {
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
        new AuthenticationError("Unauthorized access to team data"),
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const statusFilter = searchParams.get("status") || "";

    const members = await db.member.findMany({
      where: {
        organizationId: session.user.organizationId,
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
        ...(roleFilter && {
          role: roleFilter === "MEMBER" ? Role.EMPLOYEE : (roleFilter as Role),
        }),
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formatted = members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role === Role.EMPLOYEE ? "MEMBER" : m.role,
      status: m.status,
      mustChangePassword: m.user.mustChangePassword,
      createdAt: m.user.createdAt,
    }));

    return ApiResponse.success(formatted);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}

export async function POST(req: Request) {
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
          "Forbidden: only Owners and Admins can create team members",
        ),
      );
    }

    const body = await req.json();
    const parsed = createMemberSchema.parse(body);

    // Verify existing user across the platform
    const existingUser = await db.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      throw new ValidationError("A user with this email already exists.");
    }

    const targetRole =
      parsed.role === "MEMBER" ? Role.EMPLOYEE : (parsed.role as Role);

    if (targetRole === Role.OWNER && userRole !== "OWNER") {
      throw new ValidationError(
        "Forbidden: Only Owners can create or assign Owner role.",
      );
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Transactional creation of User and Member
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.email,
          name: parsed.name,
          passwordHash,
          role: targetRole,
          status: "ACTIVE",
          mustChangePassword: parsed.forcePasswordChange,
        },
      });

      const member = await tx.member.create({
        data: {
          organizationId: session.user.organizationId!,
          userId: user.id,
          role: targetRole,
          status: "ACTIVE",
        },
      });

      return { user, member };
    });

    // Logging
    await auditService.logAudit({
      action: "MEMBER_CREATED",
      message: `Created member ${parsed.email} with role ${parsed.role}`,
      context: {
        ipAddress,
        userAgent,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      metadata: {
        targetUserId: result.user.id,
        targetEmail: result.user.email,
        assignedRole: parsed.role,
        forcePasswordChange: parsed.forcePasswordChange,
      },
    });

    return ApiResponse.success({
      id: result.member.id,
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: parsed.role,
      status: "ACTIVE",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
