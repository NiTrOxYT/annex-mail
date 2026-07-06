import { MailNormalizer, NormalizedMessage } from "../provider.interface";

export class GmailNormalizer implements MailNormalizer {
  async normalizeMessage(rawMessage: unknown): Promise<NormalizedMessage> {
    const raw = rawMessage as {
      id: string;
      threadId: string;
      snippet?: string;
      internalDate?: string;
      sizeEstimate?: number;
      labelIds?: string[];
      simulated?: boolean;
      payload?: {
        mimeType?: string;
        body?: {
          size?: number;
          data?: string;
        };
        headers?: { name: string; value: string }[];
        parts?: unknown[];
      };
    };

    if (raw.simulated) {
      return this.getSimulatedMessage();
    }

    const payload = raw.payload || {};
    const headers = payload.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase(),
      );
      return header ? header.value : "";
    };

    const parseAddresses = (headerVal: string): string[] => {
      if (!headerVal) return [];
      return headerVal
        .split(",")
        .map((address) => {
          const match = address.match(/<([^>]+)>/);
          return match ? match[1].trim() : address.trim();
        })
        .filter(Boolean);
    };

    const sender = getHeader("From");
    const recipients = parseAddresses(getHeader("To"));
    const cc = parseAddresses(getHeader("Cc"));
    const bcc = parseAddresses(getHeader("Bcc"));
    const subject = getHeader("Subject") || "(No Subject)";
    const internetMessageId =
      getHeader("Message-ID") || `<gmail_${raw.id}@gmail.com>`;
    const snippet = raw.snippet || "";
    const internalDate = new Date(
      parseInt(raw.internalDate || "", 10) || Date.now(),
    );

    const headersObj: Record<string, string> = {};
    headers.forEach((h) => {
      headersObj[h.name] = h.value;
    });

    let htmlBody = "";
    let textBody = "";
    const attachments: {
      filename: string;
      mimeType: string;
      size: number;
      providerAttachmentId: string;
    }[] = [];

    // Recursively parse MIME parts
    const parseParts = (partsList: unknown[]) => {
      for (const item of partsList) {
        const part = item as {
          filename?: string;
          mimeType?: string;
          body?: {
            size?: number;
            attachmentId?: string;
            data?: string;
          };
          parts?: unknown[];
        };

        if (part.mimeType === "text/plain" && part.body?.data) {
          textBody += Buffer.from(part.body.data, "base64url").toString("utf8");
        } else if (part.mimeType === "text/html" && part.body?.data) {
          htmlBody += Buffer.from(part.body.data, "base64url").toString("utf8");
        } else if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || "application/octet-stream",
            size: part.body.size || 0,
            providerAttachmentId: part.body.attachmentId,
          });
        }

        if (part.parts) {
          parseParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      parseParts(payload.parts);
    } else if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, "base64url").toString(
        "utf8",
      );
      if (payload.mimeType === "text/html") {
        htmlBody = decoded;
      } else {
        textBody = decoded;
      }
    }

    if (!htmlBody && textBody) {
      htmlBody = `<p>${textBody.replace(/\n/g, "<br/>")}</p>`;
    }

    const labels: string[] = raw.labelIds || [];
    const isRead = !labels.includes("UNREAD");
    const isStarred = labels.includes("STARRED");
    const isImportant = labels.includes("IMPORTANT");
    const isDraft = labels.includes("DRAFT");

    return {
      providerMessageId: raw.id,
      providerThreadId: raw.threadId,
      internetMessageId,
      sender,
      recipients,
      cc,
      bcc,
      subject,
      snippet,
      htmlBody,
      textBody,
      internalDate,
      rawSize: raw.sizeEstimate || 0,
      hasAttachments: attachments.length > 0,
      isRead,
      isStarred,
      isImportant,
      isDraft,
      headers: headersObj,
      attachments,
      labels,
    };
  }

  async normalizeLabels(
    rawLabels: unknown[],
  ): Promise<{ name: string; providerId: string }[]> {
    return rawLabels.map((item) => {
      const lbl = item as { name: string; id: string };
      return {
        name: lbl.name,
        providerId: lbl.id,
      };
    });
  }

  private getSimulatedMessage(): NormalizedMessage {
    const randomId = Math.random().toString(36).substring(7);
    return {
      providerMessageId: `msg_${randomId}`,
      providerThreadId: `thread_${randomId}`,
      internetMessageId: `<msg_${randomId}@gmail.com>`,
      sender: "client@external.com",
      recipients: ["business@annex-consultancy.com"],
      cc: [],
      bcc: [],
      subject: "Simulated client query",
      snippet: "This is a simulated message snippet...",
      htmlBody:
        "<p>Hello Annex team, this is a simulated incoming mail query.</p>",
      textBody: "Hello Annex team, this is a simulated incoming mail query.",
      internalDate: new Date(),
      rawSize: 1024,
      hasAttachments: false,
      isRead: false,
      isStarred: false,
      isImportant: true,
      isDraft: false,
      labels: ["INBOX", "UNREAD"],
    };
  }
}
export const gmailNormalizer = new GmailNormalizer();
