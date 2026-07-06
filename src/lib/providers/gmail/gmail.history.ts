import { MailHistoryProvider, MailHistoryChange } from "../provider.interface";
import { EmailAccount } from "@prisma/client";
import { gmailClient } from "./gmail.client";

export class GmailHistory implements MailHistoryProvider {
  async listHistory(
    account: EmailAccount,
    startHistoryId: string,
  ): Promise<{ historyId: string; changes: MailHistoryChange[] }> {
    const res = await gmailClient.fetchWithAuth(
      account,
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}`,
    );

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { simulated?: boolean };
        if (json.simulated) {
          return {
            historyId: String(parseInt(startHistoryId, 10) + 1),
            changes: [
              {
                messageId: `msg_${Math.random().toString(36).substring(7)}`,
                threadId: `thread_${Math.random().toString(36).substring(7)}`,
                type: "added",
              },
            ],
          };
        }
      } catch {}
      throw new Error(`Failed to list Gmail history: ${res.status} - ${text}`);
    }

    const data = (await res.json()) as {
      historyId?: string;
      history?: {
        messagesAdded?: {
          message?: { id: string; threadId: string; labelIds?: string[] };
        }[];
        labelsAdded?: {
          message?: { id: string; threadId: string };
          labelIds?: string[];
        }[];
        labelsRemoved?: {
          message?: { id: string; threadId: string };
          labelIds?: string[];
        }[];
        messagesDeleted?: {
          message?: { id: string; threadId: string };
        }[];
      }[];
    };

    const changes: MailHistoryChange[] = [];

    if (data.history) {
      for (const item of data.history) {
        if (item.messagesAdded) {
          for (const entry of item.messagesAdded) {
            if (entry.message) {
              changes.push({
                messageId: entry.message.id,
                threadId: entry.message.threadId,
                type: "added",
                labelIds: entry.message.labelIds,
              });
            }
          }
        }
        if (item.labelsAdded) {
          for (const entry of item.labelsAdded) {
            if (entry.message) {
              changes.push({
                messageId: entry.message.id,
                threadId: entry.message.threadId,
                type: "labelsAdded",
                labelIds: entry.labelIds,
              });
            }
          }
        }
        if (item.labelsRemoved) {
          for (const entry of item.labelsRemoved) {
            if (entry.message) {
              changes.push({
                messageId: entry.message.id,
                threadId: entry.message.threadId,
                type: "labelsRemoved",
                labelIds: entry.labelIds,
              });
            }
          }
        }
        if (item.messagesDeleted) {
          for (const entry of item.messagesDeleted) {
            if (entry.message) {
              changes.push({
                messageId: entry.message.id,
                threadId: entry.message.threadId,
                type: "deleted",
              });
            }
          }
        }
      }
    }

    return {
      historyId: data.historyId || startHistoryId,
      changes,
    };
  }
}
export const gmailHistory = new GmailHistory();
