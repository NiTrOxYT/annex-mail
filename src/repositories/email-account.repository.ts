import { db } from "@/lib/db/db";
import { Prisma, EmailAccount } from "@prisma/client";

export class EmailAccountRepository {
  async findById(id: string): Promise<EmailAccount | null> {
    return db.emailAccount.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<EmailAccount | null> {
    return db.emailAccount.findUnique({
      where: { email },
    });
  }

  async listByOrg(organizationId: string): Promise<EmailAccount[]> {
    return db.emailAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(
    data: Prisma.EmailAccountUncheckedCreateInput,
  ): Promise<EmailAccount> {
    return db.emailAccount.create({ data });
  }

  async update(
    id: string,
    data: Prisma.EmailAccountUpdateInput,
  ): Promise<EmailAccount> {
    return db.emailAccount.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<EmailAccount> {
    return db.emailAccount.delete({
      where: { id },
    });
  }
}
