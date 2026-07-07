import { MailWatcher } from "../provider.interface";
import { EmailAccount } from "@prisma/client";
import { gmailClient } from "./gmail.client";
import { googleConfig } from "@/config/google";

export class GmailWatch implements MailWatcher {
  private topicName = googleConfig.pubSubTopic;

  async watch(
    account: EmailAccount,
  ): Promise<{ resourceId: string; expiration: Date; historyId?: string }> {
    if (
      !this.topicName ||
      this.topicName.includes("your-project-id") ||
      this.topicName.includes("projects/annex-mail/topics/incoming-emails")
    ) {
      throw new Error(
        "GOOGLE_PUB_SUB_TOPIC environment variable is missing, empty, or using placeholder values. Real Gmail watch cannot be registered.",
      );
    }

    const res = await gmailClient.fetchWithAuth(
      account,
      "https://gmail.googleapis.com/gmail/v1/users/me/watch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topicName: this.topicName,
          labelIds: ["INBOX"],
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to establish production Gmail Watch: ${res.status} - ${text}`,
      );
    }

    const data = (await res.json()) as {
      resourceId: string;
      expiration: string;
      historyId?: string;
    };
    return {
      resourceId: data.resourceId,
      expiration: new Date(parseInt(data.expiration, 10)),
      historyId: data.historyId,
    };
  }

  async stop(account: EmailAccount): Promise<void> {
    const res = await gmailClient.fetchWithAuth(
      account,
      "https://gmail.googleapis.com/gmail/v1/users/me/stop",
      { method: "POST" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to stop Gmail Watch: ${res.status} - ${text}`);
    }
  }
}
export const gmailWatch = new GmailWatch();
