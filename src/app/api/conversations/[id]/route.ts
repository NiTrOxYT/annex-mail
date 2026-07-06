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
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          include: {
            attachments: true,
            labels: { include: { label: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    if (conversation.organizationId !== session.user.organizationId) {
      throw new AuthenticationError(
        "Unauthorized access to organization conversation",
      );
    }

    return ApiResponse.success(conversation);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
