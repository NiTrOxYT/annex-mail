import { auth } from "@/lib/auth/auth";
import { searchService } from "@/services/search.service";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";

type RouteParams = { params: Promise<{ mailboxId: string }> };

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

    // Await params for Next.js 15
    const resolvedParams = await params;
    void resolvedParams.mailboxId;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const label = searchParams.get("label") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limitVal = searchParams.get("limit");
    const limit = limitVal ? parseInt(limitVal, 10) : 20;

    const result = await searchService.searchConversations({
      organizationId: session.user.organizationId,
      query,
      label,
      cursor,
      limit,
    });

    return ApiResponse.success(result);
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
