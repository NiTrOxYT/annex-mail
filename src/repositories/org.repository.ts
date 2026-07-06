import { db } from "@/lib/db/db";
import { Prisma, Organization, Member, Role } from "@prisma/client";

export class OrgRepository {
  async findOrgById(id: string): Promise<Organization | null> {
    return db.organization.findUnique({
      where: { id },
    });
  }

  async findOrgBySlug(slug: string): Promise<Organization | null> {
    return db.organization.findUnique({
      where: { slug },
    });
  }

  async createOrg(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return db.organization.create({
      data,
    });
  }

  async addMember(data: Prisma.MemberUncheckedCreateInput): Promise<Member> {
    return db.member.create({
      data,
    });
  }

  async findMember(
    organizationId: string,
    userId: string,
  ): Promise<Member | null> {
    return db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async updateMemberRole(memberId: string, role: Role): Promise<Member> {
    return db.member.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(memberId: string): Promise<Member> {
    return db.member.delete({
      where: { id: memberId },
    });
  }
}
