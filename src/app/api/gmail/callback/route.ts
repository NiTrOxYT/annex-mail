import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { encrypt } from "@/utils/crypto";
import { syncService } from "@/services/sync.service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger/logger";
import { withRateLimit } from "@/lib/security/rate-limiter";
import { googleConfig } from "@/config/google";
import { appConfig } from "@/config/app";

async function getHandler(req: Request) {
  logger.info("[OAuth] Received Gmail callback request", "GmailCallback");

  const session = await auth();
  if (
    !session ||
    !session.user ||
    !session.user.id ||
    !session.user.organizationId
  ) {
    logger.warn(
      "[OAuth] Unauthorized callback attempt (no session)",
      "GmailCallback",
    );
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Verify every required environment variable before use
  logger.info("[OAuth] Validating environment configurations", "GmailCallback");
  const missingEnvVars: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingEnvVars.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET)
    missingEnvVars.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.GOOGLE_PUB_SUB_TOPIC)
    missingEnvVars.push("GOOGLE_PUB_SUB_TOPIC");
  if (!process.env.ENCRYPTION_KEY) missingEnvVars.push("ENCRYPTION_KEY");
  if (!process.env.DATABASE_URL) missingEnvVars.push("DATABASE_URL");

  const authUrlVal = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!authUrlVal) missingEnvVars.push("AUTH_URL / NEXTAUTH_URL");

  // Check placeholder values in production
  if (process.env.NODE_ENV === "production") {
    if (process.env.GOOGLE_PUB_SUB_TOPIC?.includes("your-project-id")) {
      missingEnvVars.push("GOOGLE_PUB_SUB_TOPIC (placeholder)");
    }
    if (process.env.ENCRYPTION_KEY === "change_me_32_char_encryption_key") {
      missingEnvVars.push("ENCRYPTION_KEY (placeholder)");
    }
  }

  if (missingEnvVars.length > 0) {
    const errMsg = `Missing or invalid environment configurations: ${missingEnvVars.join(", ")}`;
    logger.error("[OAuth] Environment validation failed", "GmailCallback", {
      missingVars: missingEnvVars,
      userId: session.user.id,
      email: session.user.email,
    });
    return new Response(`Configuration Error: ${errMsg}`, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    logger.warn(
      "[OAuth] Callback request is missing authorization code",
      "GmailCallback",
    );
    return new Response("Missing authorization code", { status: 400 });
  }

  const clientId = googleConfig.clientId;
  const clientSecret = googleConfig.clientSecret;
  const redirectUri = `${appConfig.url}/api/gmail/callback`;

  try {
    // 2. Exchange authorization code
    logger.info(
      "[OAuth] Exchanging authorization code for Google tokens",
      "GmailCallback",
    );
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

    logger.info("[OAuth] Token exchange successful", "GmailCallback");

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // 3. Verify Google token response contains required fields
    logger.info("[OAuth] Verifying token response structure", "GmailCallback");
    if (!data.access_token) {
      throw new Error(
        "Google OAuth token response did not contain access_token.",
      );
    }
    if (!data.expires_in) {
      throw new Error(
        "Google OAuth token response did not contain expires_in.",
      );
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token ?? "";

    if (!refreshToken) {
      logger.warn(
        `[OAuth] refresh_token is missing from Google response for ${session.user.email}. Future token refreshes will fail unless consent is re-granted.`,
        "GmailCallback",
      );
    }

    // 4. Encrypt tokens
    logger.info("[OAuth] Encrypting credentials", "GmailCallback");
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    const emailStr = session.user.email || "business@annex-consultancy.com";

    // 5. Save EmailAccount to database in a transaction
    logger.info(
      "[OAuth] Saving EmailAccount to database in transaction",
      "GmailCallback",
    );
    const account = await db.$transaction(async (tx) => {
      return await tx.emailAccount.upsert({
        where: { email: emailStr },
        create: {
          organizationId: session.user.organizationId!,
          provider: "gmail",
          displayName: "Annex Business Gmail",
          email: emailStr,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          status: "ACTIVE",
        },
        update: {
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          status: "ACTIVE",
        },
      });
    });

    logger.info(
      `[OAuth] EmailAccount upsert completed successfully. Id: ${account.id}`,
      "GmailCallback",
    );

    // 6. Spawn initial sync asynchronously in the background. Failures inside it will not crash callback redirect.
    logger.info(
      "[OAuth] Initiating initial sync background task",
      "GmailCallback",
    );
    syncService.initialSync(account).catch((err) => {
      logger.error(
        `[OAuth] Async background initial mailbox sync task failed for ${account.email}`,
        "GmailCallback",
        {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
      );
    });

    logger.info("[OAuth] Redirecting user to settings", "GmailCallback");
    return NextResponse.redirect(new URL("/dashboard/settings", req.url));
  } catch (err) {
    const errorDetails = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      email: session.user.email || "unknown",
      userId: session.user.id || "unknown",
      organizationId: session.user.organizationId || "unknown",
    };

    logger.error(
      "[OAuth] Failed to complete Gmail OAuth connection flow",
      "GmailCallback",
      errorDetails,
    );

    return new Response(
      `Failed to complete OAuth connection flow: ${errorDetails.message}`,
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(getHandler, {
  keyPrefix: "gmail_callback",
  limit: 20,
  windowMs: 60 * 1000,
});
