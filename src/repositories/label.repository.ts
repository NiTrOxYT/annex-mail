import { db } from "@/lib/db/db";
import { Prisma, Label } from "@prisma/client";

export class LabelRepository {
  async findById(id: string): Promise<Label | null> {
    return db.label.findUnique({
      where: { id },
    });
  }

  async findByProviderId(
    organizationId: string,
    providerId: string,
  ): Promise<Label | null> {
    return db.label.findFirst({
      where: { organizationId, providerId },
    });
  }

  async findByName(
    organizationId: string,
    name: string,
  ): Promise<Label | null> {
    return db.label.findUnique({
      where: {
        organizationId_name: { organizationId, name },
      },
    });
  }

  async listByOrg(organizationId: string): Promise<Label[]> {
    return db.label.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async create(data: Prisma.LabelUncheckedCreateInput): Promise<Label> {
    return db.label.create({ data });
  }

  async update(id: string, data: Prisma.LabelUpdateInput): Promise<Label> {
    return db.label.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Label> {
    return db.label.delete({
      where: { id },
    });
  }

  async applyLabelToMessage(messageId: string, labelId: string): Promise<void> {
    await db.messageLabel.upsert({
      where: {
        messageId_labelId: { messageId, labelId },
      },
      create: { messageId, labelId },
      update: {},
    });
  }

  async removeLabelFromMessage(
    messageId: string,
    labelId: string,
  ): Promise<void> {
    try {
      await db.messageLabel.delete({
        where: {
          messageId_labelId: { messageId, labelId },
        },
      });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code !== "P2025"
      ) {
        throw err;
      }
    }
  }

  async listLabelsForMessage(messageId: string): Promise<Label[]> {
    const messageLabels = await db.messageLabel.findMany({
      where: { messageId },
      include: { label: true },
    });
    return messageLabels.map((ml) => ml.label);
  }
}
