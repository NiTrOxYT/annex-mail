import { EmailAccount } from "@prisma/client";
import { decrypt, encrypt } from "@/utils/crypto";
import { db } from "@/lib/db/db";
import { logger } from "@/lib/logger/logger";

export class GmailClient {
  private clientId =
    process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder";
  private clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder";

  async getAccessToken(account: EmailAccount): Promise<string> {
    if (!account.encryptedAccessToken || !account.expiresAt) {
      throw new Error("No tokens configured for account");
    }

    const expiresAt = new Date(account.expiresAt);
    // 1 min buffer
    if (Date.now() + 60000 < expiresAt.getTime()) {
      return decrypt(account.encryptedAccessToken);
    }

    if (!account.encryptedRefreshToken) {
      throw new Error("Access token expired and no refresh token available");
    }

    const refreshToken = decrypt(account.encryptedRefreshToken);
    logger.info(
      `Refreshing Google OAuth access token for account: ${account.email}`,
      "GmailClient",
    );

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Failed to refresh token: ${response.status} - ${errText}`,
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      const newAccessToken = data.access_token;
      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      await db.emailAccount.update({
        where: { id: account.id },
        data: {
          encryptedAccessToken: encrypt(newAccessToken),
          expiresAt: newExpiresAt,
        },
      });

      return newAccessToken;
    } catch (err) {
      logger.error("Token refresh failed", "GmailClient", {
        error: String(err),
      });
      throw err;
    }
  }

  async fetchWithAuth(
    account: EmailAccount,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    if (
      this.clientId === "google_client_id_placeholder" ||
      account.encryptedAccessToken === "placeholder"
    ) {
      // Return a simulated response when no key matches
      return new Response(JSON.stringify({ simulated: true }));
    }

    const token = await this.getAccessToken(account);
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, { ...options, headers });
  }
}
export const gmailClient = new GmailClient();
