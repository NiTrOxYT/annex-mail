import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { syncService } from "@/services/sync.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError, NotFoundError } from "@/utils/errors";
import { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
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

    // Run synchronization synchronously and get summary stats
    const summary = await syncService.initialSync(account);

    return ApiResponse.success({
      message: "Synchronization completed successfully",
      summary,
    });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
