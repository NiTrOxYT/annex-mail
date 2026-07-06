import {
  EmailMessage,
  EmailProvider,
  SendEmailOptions,
} from "../provider.interface";
import { logger } from "@/lib/logger/logger";

export class MockEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    logger.info(
      `[MockEmailProvider] Sending email to ${options.to.join(", ")}: ${options.subject}`,
      "MockEmailProvider",
    );
    return { messageId: `mock-msg-${Date.now()}` };
  }

  async reply(
    threadId: string,
    options: Omit<SendEmailOptions, "subject">,
  ): Promise<{ messageId: string }> {
    logger.info(
      `[MockEmailProvider] Replying to thread ${threadId} to ${options.to.join(", ")}`,
      "MockEmailProvider",
    );
    return { messageId: `mock-msg-reply-${Date.now()}` };
  }

  async forward(
    messageId: string,
    to: string[],
    comment?: string,
  ): Promise<{ messageId: string }> {
    logger.info(
      `[MockEmailProvider] Forwarding message ${messageId} to ${to.join(", ")} with comment: ${comment}`,
      "MockEmailProvider",
    );
    return { messageId: `mock-msg-forward-${Date.now()}` };
  }

  async sync(since?: Date): Promise<EmailMessage[]> {
    logger.info(
      `[MockEmailProvider] Syncing emails since ${since || "beginning"}`,
      "MockEmailProvider",
    );
    return [];
  }
}
