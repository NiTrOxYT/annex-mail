import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, NotFoundError } from "@/utils/errors";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: RouteParams) {
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

    const resolvedParams = await params;
    const account = await db.emailAccount.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!account) {
      throw new NotFoundError("Email account not found");
    }

    if (account.organizationId !== session.user.organizationId) {
      throw new AuthenticationError("Unauthorized access to email account");
    }

    // Delete the account (will cascade delete syncState and watchState)
    await db.emailAccount.delete({
      where: { id: resolvedParams.id },
    });

    return ApiResponse.success({
      id: resolvedParams.id,
      message: "Email account disconnected successfully",
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
