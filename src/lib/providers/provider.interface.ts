import { EmailAccount } from "@prisma/client";

export interface NormalizedMessage {
  providerMessageId: string;
  providerThreadId: string;
  internetMessageId: string;
  sender: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  snippet?: string;
  htmlBody?: string;
  textBody?: string;
  internalDate: Date;
  rawSize?: number;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  isDraft: boolean;
  headers?: Record<string, string>;
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    content?: string; // base64
    providerAttachmentId: string;
  }[];
  labels: string[]; // List of label names or label provider IDs
}

export interface MailNormalizer {
  // Use unknown for dynamic external provider structures
  normalizeMessage(rawMessage: unknown): Promise<NormalizedMessage>;
  normalizeLabels(
    rawLabels: unknown[],
  ): Promise<{ name: string; providerId: string }[]>;
}

export interface MailImporter {
  fetchMessage(account: EmailAccount, messageId: string): Promise<unknown>;
  fetchThread(account: EmailAccount, threadId: string): Promise<unknown[]>;
  fetchAttachment(
    account: EmailAccount,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer>;
  listLabels(account: EmailAccount): Promise<unknown[]>;
}

export interface MailWatcher {
  watch(
    account: EmailAccount,
  ): Promise<{ resourceId: string; expiration: Date }>;
  stop(account: EmailAccount): Promise<void>;
}

export interface MailHistoryChange {
  messageId: string;
  threadId: string;
  type: "added" | "deleted" | "labelsAdded" | "labelsRemoved";
  labelIds?: string[];
}

export interface MailHistoryProvider {
  listHistory(
    account: EmailAccount,
    startHistoryId: string,
  ): Promise<{
    historyId: string;
    changes: MailHistoryChange[];
  }>;
}

export interface MailProvider {
  getImporter(): MailImporter;
  getNormalizer(): MailNormalizer;
  getWatcher(): MailWatcher;
  getHistoryProvider(): MailHistoryProvider;
}
