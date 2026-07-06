import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { z } from "zod";

const archiveSchema = z.object({
  conversationId: z.string(),
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
    const parsed = archiveSchema.parse(body);

    await db.conversation.updateMany({
      where: {
        id: parsed.conversationId,
        organizationId: session.user.organizationId,
      },
      data: { status: "ARCHIVED" },
    });

    return ApiResponse.success({ success: true });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
