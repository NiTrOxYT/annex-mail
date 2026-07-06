import { db } from "@/lib/db/db";
import {
  Prisma,
  Conversation,
  ConversationStatus,
  Message,
  Attachment,
  User,
} from "@prisma/client";

export type ConversationWithMessages = Conversation & {
  messages: (Message & {
    attachments: Attachment[];
    sentByUser: User | null;
  })[];
};

export class ConversationRepository {
  async findById(id: string): Promise<ConversationWithMessages | null> {
    return db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          include: {
            attachments: true,
            sentByUser: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }) as Promise<ConversationWithMessages | null>;
  }

  async findByThreadKey(threadKey: string): Promise<Conversation | null> {
    return db.conversation.findUnique({
      where: { threadKey },
    });
  }

  async listByOrg(
    organizationId: string,
    status?: ConversationStatus,
    limit = 20,
    cursor?: string,
  ): Promise<Conversation[]> {
    return db.conversation.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
        deletedAt: null,
      },
      take: limit + 1, // Support cursor check
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async create(
    data: Prisma.ConversationUncheckedCreateInput,
  ): Promise<Conversation> {
    return db.conversation.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ConversationUpdateInput,
  ): Promise<Conversation> {
    return db.conversation.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Conversation> {
    return db.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
