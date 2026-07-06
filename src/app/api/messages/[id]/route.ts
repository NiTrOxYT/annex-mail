import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, NotFoundError } from "@/utils/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const message = await db.message.findUnique({
      where: { id },
      include: {
        attachments: true,
        labels: { include: { label: true } },
      },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    const conversation = await db.conversation.findUnique({
      where: { id: message.conversationId },
    });

    if (
      !conversation ||
      conversation.organizationId !== session.user.organizationId
    ) {
      throw new AuthenticationError(
        "Unauthorized access to organization message",
      );
    }

    return ApiResponse.success(message);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
