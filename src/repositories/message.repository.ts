import { db } from "@/lib/db/db";
import { Prisma, Message, Attachment, DeliveryStatus } from "@prisma/client";

export type MessageWithAttachments = Message & {
  attachments: Attachment[];
};

export class MessageRepository {
  async findById(id: string): Promise<MessageWithAttachments | null> {
    return db.message.findUnique({
      where: { id },
      include: { attachments: true },
    }) as Promise<MessageWithAttachments | null>;
  }

  async findByMessageId(
    internetMessageId: string,
  ): Promise<MessageWithAttachments | null> {
    return db.message.findUnique({
      where: { internetMessageId },
      include: { attachments: true },
    }) as Promise<MessageWithAttachments | null>;
  }

  async create(
    data: Prisma.MessageUncheckedCreateInput,
    attachments: Prisma.AttachmentCreateWithoutMessageInput[] = [],
  ): Promise<MessageWithAttachments> {
    return db.message.create({
      data: {
        ...data,
        attachments: {
          create: attachments,
        },
      },
      include: { attachments: true },
    });
  }

  async updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
  ): Promise<Message> {
    return db.message.update({
      where: { id },
      data: { deliveryStatus: status },
    });
  }
}
