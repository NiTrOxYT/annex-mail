import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { encrypt } from "@/utils/crypto";
import { syncService } from "@/services/sync.service";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger/logger";

import { withRateLimit } from "@/lib/security/rate-limiter";

async function getHandler(req: Request) {
  const session = await auth();
  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.organizationId
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder";
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder";
  const redirectUri = `${
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  }/api/gmail/callback`;

  try {
    let accessToken = "placeholder";
    let refreshToken = "placeholder";
    let expiresAt = new Date(Date.now() + 3600 * 1000);

    if (clientId !== "google_client_id_placeholder") {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `OAuth token exchange failed: ${response.status} - ${errText}`,
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      accessToken = data.access_token;
      refreshToken = data.refresh_token || refreshToken;
      expiresAt = new Date(Date.now() + data.expires_in * 1000);
    }

    const emailStr = session.user.email || "business@annex-consultancy.com";
    const account = await db.emailAccount.upsert({
      where: { email: emailStr },
      create: {
        organizationId: session.user.organizationId,
        provider: "gmail",
        displayName: "Annex Business Gmail",
        email: emailStr,
        encryptedAccessToken: encrypt(accessToken),
        encryptedRefreshToken: encrypt(refreshToken),
        expiresAt,
        status: "ACTIVE",
      },
      update: {
        encryptedAccessToken: encrypt(accessToken),
        encryptedRefreshToken: encrypt(refreshToken),
        expiresAt,
        status: "ACTIVE",
      },
    });

    syncService.initialSync(account).catch((err) => {
      logger.error(
        `Initial mailbox sync failed for ${account.email}`,
        "GmailCallback",
        { error: String(err) },
      );
    });

    return redirect("/dashboard/settings");
  } catch (err) {
    logger.error("OAuth callback error", "GmailCallback", {
      error: String(err),
    });
    return new Response("Failed to complete OAuth connection flow", {
      status: 500,
    });
  }
}

export const GET = withRateLimit(getHandler, {
  keyPrefix: "gmail_callback",
  limit: 20,
  windowMs: 60 * 1000,
});
