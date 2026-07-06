import { MailWatcher } from "../provider.interface";
import { EmailAccount } from "@prisma/client";
import { gmailClient } from "./gmail.client";

export class GmailWatch implements MailWatcher {
  private topicName =
    process.env.GOOGLE_PUB_SUB_TOPIC ||
    "projects/annex-mail/topics/incoming-emails";

  async watch(
    account: EmailAccount,
  ): Promise<{ resourceId: string; expiration: Date }> {
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
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) {
          return {
            resourceId: "simulated_watch_resource_id",
            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          };
        }
      } catch {}
      throw new Error(
        `Failed to establish Gmail Watch: ${res.status} - ${text}`,
      );
    }

    const data = (await res.json()) as {
      resourceId: string;
      expiration: string;
    };
    return {
      resourceId: data.resourceId,
      expiration: new Date(parseInt(data.expiration, 10)),
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
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) return;
      } catch {}
      throw new Error(`Failed to stop Gmail Watch: ${res.status} - ${text}`);
    }
  }
}
export const gmailWatch = new GmailWatch();
