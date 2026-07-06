import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";

export async function GET() {
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

    const accounts = await db.emailAccount.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        syncState: true,
      },
    });

    return ApiResponse.success(accounts);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
