import { auth } from "@/lib/auth/auth";
import { ApiResponse } from "@/utils/api";
import { AuthenticationError } from "@/utils/errors";

export async function POST() {
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

    const clientId =
      process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder";
    const redirectUri = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/api/gmail/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
      "offline",
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(
      scopes.join(" "),
    )}&access_type=offline&prompt=consent`;

    return ApiResponse.success({ url: authUrl });
  } catch (err) {
    return ApiResponse.failure(err);
  }
}
