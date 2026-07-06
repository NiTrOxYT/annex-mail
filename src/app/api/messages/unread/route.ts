import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

const unreadSchema = z.object({
  messageId: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (
      !session ||
      !session.user ||
      !session.user.id ||
      !session.user.organizationId
    ) {
      throw new AuthenticationError("User is not authenticated");
    }

    const body = await req.json();
    const parsed = unreadSchema.parse(body);

    if (parsed.messageId) {
      await db.message.updateMany({
        where: {
          id: parsed.messageId,
          conversation: { organizationId: session.user.organizationId },
        },
        data: { isRead: false },
      });
    } else if (parsed.conversationId) {
      await db.message.updateMany({
        where: {
          conversationId: parsed.conversationId,
          conversation: { organizationId: session.user.organizationId },
        },
        data: { isRead: false },
      });
    }

    return ApiResponse.success({ success: true });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
