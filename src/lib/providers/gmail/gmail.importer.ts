import { MailImporter } from "../provider.interface";
import { EmailAccount } from "@prisma/client";
import { gmailClient } from "./gmail.client";

export class GmailImporter implements MailImporter {
  async fetchMessage(
    account: EmailAccount,
    messageId: string,
  ): Promise<unknown> {
    const res = await gmailClient.fetchWithAuth(
      account,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    );
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) return json;
      } catch {}
      throw new Error(
        `Failed to fetch message ${messageId}: ${res.status} - ${text}`,
      );
    }
    return res.json();
  }

  async fetchThread(
    account: EmailAccount,
    threadId: string,
  ): Promise<unknown[]> {
    const res = await gmailClient.fetchWithAuth(
      account,
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
    );
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) return [json];
      } catch {}
      throw new Error(
        `Failed to fetch thread ${threadId}: ${res.status} - ${text}`,
      );
    }
    const data = (await res.json()) as { messages?: unknown[] };
    return data.messages || [];
  }

  async fetchAttachment(
    account: EmailAccount,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const res = await gmailClient.fetchWithAuth(
      account,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    );
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) return Buffer.from("simulated_content");
      } catch {}
      throw new Error(
        `Failed to fetch attachment ${attachmentId}: ${res.status} - ${text}`,
      );
    }
    const data = (await res.json()) as { data: string };
    const cleanBase64 = data.data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(cleanBase64, "base64");
  }

  async listLabels(account: EmailAccount): Promise<unknown[]> {
    const res = await gmailClient.fetchWithAuth(
      account,
      "https://gmail.googleapis.com/gmail/v1/users/me/labels",
    );
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as {
          simulated?: boolean;
          labels?: unknown[];
        };
        if (json.simulated) {
          return [
            { id: "INBOX", name: "INBOX" },
            { id: "SENT", name: "SENT" },
            { id: "UNREAD", name: "UNREAD" },
          ];
        }
      } catch {}
      throw new Error(`Failed to list labels: ${res.status} - ${text}`);
    }
    const data = (await res.json()) as { labels?: unknown[] };
    return data.labels || [];
  }
}
export const gmailImporter = new GmailImporter();
