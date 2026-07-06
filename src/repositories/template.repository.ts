import { db } from "@/lib/db/db";
import { Prisma, Template } from "@prisma/client";

export class TemplateRepository {
  async findById(id: string): Promise<Template | null> {
    return db.template.findUnique({
      where: { id },
    });
  }

  async listByOrg(organizationId: string): Promise<Template[]> {
    return db.template.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(data: Prisma.TemplateUncheckedCreateInput): Promise<Template> {
    return db.template.create({ data });
  }

  async update(
    id: string,
    data: Prisma.TemplateUpdateInput,
  ): Promise<Template> {
    return db.template.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Template> {
    return db.template.delete({
      where: { id },
    });
  }
}
