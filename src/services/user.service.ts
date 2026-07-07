import { Role, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  UserRepository,
  UserWithMemberships,
} from "@/repositories/user.repository";
import { OrgRepository } from "@/repositories/org.repository";
import { logger } from "@/lib/logger/logger";

export class UserService {
  private userRepo = new UserRepository();
  private orgRepo = new OrgRepository();

  async createUser(
    email: string,
    plainTextPassword: string,
    name?: string,
  ): Promise<User> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      logger.warn(
        `Attempt to create user with existing email: ${email}`,
        "UserService",
      );
      throw new Error("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(plainTextPassword, 10);
    const user = await this.userRepo.create({
      email,
      name,
      passwordHash,
    });

    logger.audit(
      "USER_CREATED",
      user.id,
      `User created successfully: ${email}`,
    );
    return user;
  }

  async validateCredentials(
    email: string,
    plainTextPassword: string,
  ): Promise<UserWithMemberships | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      logger.warn(
        `Login failed: user not found or no password hash set for ${email}`,
        "UserService",
      );
      return null;
    }

    if (user.status === "DISABLED") {
      logger.warn(
        `Login failed: user account disabled for ${email}`,
        "UserService",
      );
      return null;
    }

    const primaryMembership = user.memberships?.[0];
    if (primaryMembership && primaryMembership.status === "DISABLED") {
      logger.warn(
        `Login failed: user membership disabled in primary org for ${email}`,
        "UserService",
      );
      return null;
    }

    const matches = await bcrypt.compare(plainTextPassword, user.passwordHash);
    if (!matches) {
      logger.warn(`Login failed: invalid password for ${email}`, "UserService");
      return null;
    }

    // Update lastLoginAt
    await this.userRepo
      .update(user.id, {
        lastLoginAt: new Date(),
      })
      .catch((err) =>
        logger.error(`Failed to update lastLoginAt: ${err}`, "UserService"),
      );

    return user;
  }

  async assignToOrganization(
    userId: string,
    orgId: string,
    role: Role = Role.EMPLOYEE,
  ) {
    const existingMember = await this.orgRepo.findMember(orgId, userId);
    if (existingMember) {
      logger.warn(
        `User ${userId} is already a member of org ${orgId}`,
        "UserService",
      );
      throw new Error("User is already a member of this organization");
    }

    const member = await this.orgRepo.addMember({
      userId,
      organizationId: orgId,
      role,
    });

    logger.info(
      `Assigned user ${userId} to org ${orgId} with role ${role}`,
      "UserService",
    );
    return member;
  }
}
