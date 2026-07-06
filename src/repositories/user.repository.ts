import { db } from "@/lib/db/db";
import { Prisma, User, Member, Organization } from "@prisma/client";

export type UserWithMemberships = User & {
  memberships: (Member & {
    organization: Organization;
  })[];
};

export class UserRepository {
  async findById(id: string): Promise<UserWithMemberships | null> {
    return db.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    }) as Promise<UserWithMemberships | null>;
  }

  async findByEmail(email: string): Promise<UserWithMemberships | null> {
    return db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    }) as Promise<UserWithMemberships | null>;
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return db.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }
}
