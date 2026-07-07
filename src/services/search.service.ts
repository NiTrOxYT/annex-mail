import { db } from "@/lib/db/db";
import { Prisma } from "@prisma/client";

export interface SearchOptions {
  query?: string;
  sender?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  label?: string;
  unreadOnly?: boolean;
  starredOnly?: boolean;
  organizationId: string;
  limit?: number;
  cursor?: string;
}

export class SearchService {
  async searchConversations(options: SearchOptions): Promise<{
    items: unknown[];
    nextCursor: string | null;
  }> {
    const limit = options.limit ?? 20;
    const whereClause: Prisma.ConversationWhereInput = {
      organizationId: options.organizationId,
    };

    if (options.query) {
      whereClause.OR = [
        { subject: { contains: options.query, mode: "insensitive" } },
        {
          messages: {
            some: {
              OR: [
                { htmlBody: { contains: options.query, mode: "insensitive" } },
                { textBody: { contains: options.query, mode: "insensitive" } },
                { sender: { contains: options.query, mode: "insensitive" } },
                { snippet: { contains: options.query, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    if (options.sender) {
      whereClause.messages = {
        some: { sender: { contains: options.sender, mode: "insensitive" } },
      };
    }

    if (options.label) {
      whereClause.messages = {
        some: {
          labels: {
            some: {
              label: {
                name: { equals: options.label, mode: "insensitive" },
              },
            },
          },
        },
      };
    }

    if (options.unreadOnly) {
      whereClause.messages = {
        some: { isRead: false },
      };
    }

    if (options.starredOnly) {
      whereClause.messages = {
        some: { isStarred: true },
      };
    }

    const items = await db.conversation.findMany({
      where: whereClause,
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          select: {
            id: true,
            sender: true,
            recipients: true,
            cc: true,
            bcc: true,
            subject: true,
            snippet: true,
            isRead: true,
            isStarred: true,
            internalDate: true,
            direction: true,
            attachments: true,
            labels: { include: { label: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    return { items, nextCursor };
  }
}
export const searchService = new SearchService();
