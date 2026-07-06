import { db } from "@/lib/db/db";
import { Prisma, Draft } from "@prisma/client";

export class DraftRepository {
  async findById(id: string): Promise<Draft | null> {
    return db.draft.findUnique({
      where: { id },
    });
  }

  async listByOrg(organizationId: string): Promise<Draft[]> {
    return db.draft.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(data: Prisma.DraftUncheckedCreateInput): Promise<Draft> {
    return db.draft.create({ data });
  }

  async update(id: string, data: Prisma.DraftUpdateInput): Promise<Draft> {
    return db.draft.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Draft> {
    return db.draft.delete({
      where: { id },
    });
  }
}
