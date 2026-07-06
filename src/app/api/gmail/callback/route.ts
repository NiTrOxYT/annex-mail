import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { encrypt } from "@/utils/crypto";
import { syncService } from "@/services/sync.service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger/logger";
import { withRateLimit } from "@/lib/security/rate-limiter";
import { googleConfig } from "@/config/google";
import { appConfig } from "@/config/app";
import crypto from "crypto";

async function getHandler(req: Request) {
  logger.info("[OAuth] OAuth callback started", "GmailCallback");

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

  // Log code hash (first 8 chars of SHA-256)
  const codeHash = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex")
    .substring(0, 8);
  logger.info(
    `[OAuth] Authorization code hash (first 8 chars): ${codeHash}`,
    "GmailCallback",
  );

  const emailStr = session.user.email || "business@annex-consultancy.com";
  const clientId = googleConfig.clientId;
  const clientSecret = googleConfig.clientSecret;
  const redirectUri = `${appConfig.url}/api/gmail/callback`;

  try {
    // 2. Exchange authorization code using application/x-www-form-urlencoded
    logger.info("[OAuth] Token exchange started", "GmailCallback");

    const obscuredClientId =
      clientId.length > 20
        ? `${clientId.substring(0, 8)}...${clientId.substring(clientId.length - 8)}`
        : "obscured_client_id";

    logger.info(
      `[OAuth] Token Exchange parameters: Endpoint=https://oauth2.googleapis.com/token, grant_type=authorization_code, redirect_uri=${redirectUri}, client_id=${obscuredClientId}`,
      "GmailCallback",
    );

    const tokenParams = new URLSearchParams();
    tokenParams.append("code", code);
    tokenParams.append("client_id", clientId);
    tokenParams.append("client_secret", clientSecret);
    tokenParams.append("redirect_uri", redirectUri);
    tokenParams.append("grant_type", "authorization_code");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();

      // Log Google's full response body on failure
      logger.error(
        `[OAuth] Google Token Exchange error response body: ${errText}`,
        "GmailCallback",
        { status: response.status },
      );

      // Handle double-redirect race condition gracefully:
      // If code was already exchanged by a preceding request, the database record
      // should already be ACTIVE. If so, redirect to settings instead of showing 500 error.
      const existingAccount = await db.emailAccount.findUnique({
        where: { email: emailStr },
      });

      if (
        existingAccount &&
        existingAccount.status === "ACTIVE" &&
        existingAccount.encryptedRefreshToken
      ) {
        logger.warn(
          `[OAuth] Token exchange returned ${response.status} (invalid_grant), but EmailAccount is already ACTIVE. Assuming code was already consumed by preceding request. Redirecting user to settings.`,
          "GmailCallback",
        );
        return NextResponse.redirect(new URL("/dashboard/settings", req.url));
      }

      throw new Error(
        `OAuth token exchange failed: ${response.status} - ${errText}`,
      );
    }

    logger.info("[OAuth] Token exchange completed", "GmailCallback");

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // 3. Verify Google token response structure
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
    const encryptedRefreshToken = refreshToken
      ? encrypt(refreshToken)
      : undefined;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // 5. Save EmailAccount to database in a transaction
    logger.info(
      "[OAuth] Saving EmailAccount to database in transaction",
      "GmailCallback",
    );
    const account = await db.$transaction(async (tx) => {
      // If refreshToken is omitted (due to re-auth without consent prompt), keep the old one
      const updateData: Record<string, unknown> = {
        encryptedAccessToken,
        expiresAt,
        status: "ACTIVE",
      };
      if (encryptedRefreshToken) {
        updateData.encryptedRefreshToken = encryptedRefreshToken;
      }

      return await tx.emailAccount.upsert({
        where: { email: emailStr },
        create: {
          organizationId: session.user.organizationId!,
          provider: "gmail",
          displayName: "Annex Business Gmail",
          email: emailStr,
          encryptedAccessToken,
          encryptedRefreshToken: encryptedRefreshToken ?? "",
          expiresAt,
          status: "ACTIVE",
        },
        update: updateData,
      });
    });

    logger.info(
      `[OAuth] EmailAccount upsert completed successfully. Id: ${account.id}`,
      "GmailCallback",
    );

    // 6. Spawn initial sync asynchronously in background
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
