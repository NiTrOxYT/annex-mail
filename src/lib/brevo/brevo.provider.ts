import {
  EmailProvider,
  SendEmailOptions,
  EmailMessage,
} from "../email/provider.interface";
import { emailConfig } from "@/config/email";
import { logger } from "@/lib/logger/logger";
import { ProviderError } from "@/utils/errors";

export class BrevoProvider implements EmailProvider {
  private apiKey: string;
  private defaultSenderName: string;
  private defaultSenderEmail: string;

  constructor() {
    this.apiKey = emailConfig.brevo.apiKey || "";
    this.defaultSenderName = emailConfig.from.name || "Annex";
    this.defaultSenderEmail =
      emailConfig.from.address || "business@annex-consultancy.com";
  }

  async send(
    options: SendEmailOptions & { headers?: Record<string, string> },
  ): Promise<{ messageId: string }> {
    if (!this.apiKey || this.apiKey === "brevo_api_key_placeholder") {
      logger.warn(
        "Brevo API Key missing or placeholder, simulating email send",
        "BrevoProvider",
      );
      const simulatedId = `<simulated_${Math.random()
        .toString(36)
        .substring(7)}@annex-consultancy.com>`;
      return { messageId: simulatedId };
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: this.defaultSenderName,
            email: this.defaultSenderEmail,
          },
          to: options.to.map((email) => ({ email })),
          ...(options.cc ? { cc: options.cc.map((email) => ({ email })) } : {}),
          ...(options.bcc
            ? { bcc: options.bcc.map((email) => ({ email })) }
            : {}),
          subject: options.subject,
          htmlContent: options.body,
          ...(options.attachments
            ? {
                attachment: options.attachments.map((att) => ({
                  name: att.filename,
                  content:
                    typeof att.content === "string"
                      ? Buffer.from(att.content).toString("base64")
                      : att.content.toString("base64"),
                })),
              }
            : {}),
          ...(options.headers ? { headers: options.headers } : {}),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new ProviderError(
          `Brevo API returned error: ${response.status} - ${errText}`,
        );
      }

      const resData = (await response.json()) as { messageId?: string };
      return {
        messageId:
          resData.messageId ||
          `<generated_${Date.now()}@annex-consultancy.com>`,
      };
    } catch (err) {
      logger.error(
        "Failed to send transactional email via Brevo",
        "BrevoProvider",
        {
          error: String(err),
        },
      );
      throw err instanceof ProviderError
        ? err
        : new ProviderError("Error communicating with Brevo", err);
    }
  }

  async reply(
    threadId: string,
    options: Omit<SendEmailOptions, "subject"> & {
      headers?: Record<string, string>;
      subject?: string;
    },
  ): Promise<{ messageId: string }> {
    return this.send({
      ...options,
      subject: options.subject || "",
    });
  }

  async forward(
    _messageId: string,
    _to: string[],
    _comment?: string,
  ): Promise<{ messageId: string }> {
    void _messageId;
    void _to;
    void _comment;
    throw new Error(
      "Forwarding must be managed via MailService to load original message body",
    );
  }

  async sync(_since?: Date): Promise<EmailMessage[]> {
    void _since;
    return [];
  }
}
export const brevoProvider = new BrevoProvider();
