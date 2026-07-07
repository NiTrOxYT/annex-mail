import { auth } from "@/lib/auth/auth";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";
import { withRateLimit } from "@/lib/security/rate-limiter";
import { googleConfig } from "@/config/google";
import { appConfig } from "@/config/app";

async function postHandler() {
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

    if (session.user.role !== "OWNER") {
      return ApiResponse.failure(
        new AuthenticationError(
          "Forbidden: only Owners can connect new mailboxes",
        ),
      );
    }

    const clientId = googleConfig.clientId;
    const redirectUri = `${appConfig.url}/api/gmail/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(
      scopes.join(" "),
    )}&access_type=offline&prompt=consent&include_granted_scopes=true`;

    return ApiResponse.success({ url: authUrl });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}

export const POST = withRateLimit(postHandler, {
  keyPrefix: "gmail_connect",
  limit: 20,
  windowMs: 60 * 1000,
});
