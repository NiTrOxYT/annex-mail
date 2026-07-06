import { container } from "@/lib/di/container";
import { EmailProvider } from "@/lib/email/provider.interface";

import { EmailAccountRepository } from "@/repositories/email-account.repository";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageRepository } from "@/repositories/message.repository";
import { DraftRepository } from "@/repositories/draft.repository";
import { TemplateRepository } from "@/repositories/template.repository";
import { AuditService } from "@/lib/audit/audit.service";
import { eventBus } from "@/lib/events/event-bus";
import { emailValidator } from "@/validators/shared/email";
import { AppError, ValidationError, NotFoundError } from "@/utils/errors";
import { Result, ok, fail } from "@/utils/result";
import {
  DeliveryStatus,
  MessageDirection,
  ConversationStatus,
} from "@prisma/client";
import crypto from "crypto";

export interface SendMailInput {
  accountId: string;
  organizationId: string;
  userId: string;
  userName: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string; // HTML
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    storagePath: string; // Already written via StorageProvider
    content: string; // Base64 content for API payload
  }[];
  context?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface ReplyMailInput {
  conversationId: string;
  userId: string;
  userName: string;
  body: string; // HTML
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    storagePath: string;
    content: string;
  }[];
  context?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface ForwardMailInput {
  originalMessageId: string;
  userId: string;
  userName: string;
  to: string[];
  comment?: string;
  context?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export class MailService {
  private emailAccountRepo = new EmailAccountRepository();
  private conversationRepo = new ConversationRepository();
  private messageRepo = new MessageRepository();
  private draftRepo = new DraftRepository();
  private templateRepo = new TemplateRepository();
  private auditService = new AuditService();

  private getEmailProvider(): EmailProvider {
    return container.resolve<EmailProvider>("EmailProvider");
  }

  private validateRecipients(emails: string[]) {
    for (const email of emails) {
      const parsed = emailValidator.safeParse(email);
      if (!parsed.success) {
        throw new ValidationError(`Invalid recipient email: ${email}`);
      }
    }
  }

  private generateMessageId(): string {
    return `<${crypto.randomUUID()}@annex-consultancy.com>`;
  }

  async send(input: SendMailInput): Promise<Result<{ messageId: string }>> {
    try {
      this.validateRecipients(input.to);
      if (input.cc) this.validateRecipients(input.cc);
      if (input.bcc) this.validateRecipients(input.bcc);

      const account = await this.emailAccountRepo.findById(input.accountId);
      if (!account) {
        throw new NotFoundError("Email account not found");
      }

      const generatedMsgId = this.generateMessageId();
      const headers = { "Message-ID": generatedMsgId };

      const { sanitizeHtml } = await import("@/lib/security/sanitizer");
      const sanitizedBody = sanitizeHtml(input.body);

      const provider = this.getEmailProvider();
      const sendResult = await provider.send({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: sanitizedBody,
        attachments: input.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.mimeType,
        })),
        headers,
      });

      // Create conversation
      const conversation = await this.conversationRepo.create({
        organizationId: input.organizationId,
        accountId: input.accountId,
        subject: input.subject,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
      });

      // Save message
      const message = await this.messageRepo.create(
        {
          conversationId: conversation.id,
          providerMessageId: sendResult.messageId,
          internetMessageId: generatedMsgId,
          direction: MessageDirection.OUTBOUND,
          sender: account.email,
          recipients: input.to,
          cc: input.cc || [],
          bcc: input.bcc || [],
          subject: input.subject,
          htmlBody: sanitizedBody,
          deliveryStatus: DeliveryStatus.SENT,
          sentByUserId: input.userId,
        },
        input.attachments?.map((att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          storageProvider: "local",
          storagePath: att.storagePath,
        })),
      );

      // Audit log activity
      await this.auditService.logActivity({
        userId: input.userId,
        userName: input.userName,
        message: `Sent email to ${input.to.join(", ")} with subject "${input.subject}"`,
        context: {
          userId: input.userId,
          organizationId: input.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
      });

      await this.auditService.logAudit({
        action: "EMAIL_SENT",
        message: `Outbound email successfully sent to ${input.to.join(", ")}`,
        context: {
          userId: input.userId,
          organizationId: input.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
        metadata: {
          messageId: message.id,
          providerMessageId: sendResult.messageId,
          conversationId: conversation.id,
          recipientCount: input.to.length,
        },
      });

      await eventBus.publish({
        name: "MAIL_SENT",
        timestamp: new Date(),
        payload: { messageId: message.id, conversationId: conversation.id },
      });

      return ok({ messageId: message.id });
    } catch (err) {
      return fail(err instanceof AppError ? err : new AppError(String(err)));
    }
  }

  async reply(input: ReplyMailInput): Promise<Result<{ messageId: string }>> {
    try {
      const parentConversation = await this.conversationRepo.findById(
        input.conversationId,
      );
      if (!parentConversation) {
        throw new NotFoundError("Conversation not found");
      }

      const lastMessage =
        parentConversation.messages[parentConversation.messages.length - 1];
      if (!lastMessage) {
        throw new ValidationError(
          "No messages found in conversation to reply to",
        );
      }

      const account = await this.emailAccountRepo.findById(
        parentConversation.accountId,
      );
      if (!account) {
        throw new NotFoundError("Email account not found");
      }

      const generatedMsgId = this.generateMessageId();
      const inReplyTo = lastMessage.internetMessageId;
      const references = lastMessage.references
        ? `${lastMessage.references} ${lastMessage.internetMessageId}`
        : lastMessage.internetMessageId;

      const headers = {
        "Message-ID": generatedMsgId,
        "In-Reply-To": inReplyTo,
        References: references,
      };

      const replySubject = lastMessage.subject.startsWith("Re:")
        ? lastMessage.subject
        : `Re: ${lastMessage.subject}`;

      const { sanitizeHtml } = await import("@/lib/security/sanitizer");
      const sanitizedBody = sanitizeHtml(input.body);

      const provider = this.getEmailProvider();
      const replyResult = await provider.reply(parentConversation.id, {
        to: [lastMessage.sender],
        body: sanitizedBody,
        attachments: input.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.mimeType,
        })),
        headers,
        subject: replySubject,
      });

      // Save reply message
      const message = await this.messageRepo.create(
        {
          conversationId: parentConversation.id,
          providerMessageId: replyResult.messageId,
          internetMessageId: generatedMsgId,
          inReplyTo,
          references,
          direction: MessageDirection.OUTBOUND,
          sender: account.email,
          recipients: [lastMessage.sender],
          cc: [],
          bcc: [],
          subject: replySubject,
          htmlBody: sanitizedBody,
          deliveryStatus: DeliveryStatus.SENT,
          sentByUserId: input.userId,
        },
        input.attachments?.map((att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          storageProvider: "local",
          storagePath: att.storagePath,
        })),
      );

      // Update conversation timestamp
      await this.conversationRepo.update(parentConversation.id, {
        lastMessageAt: new Date(),
      });

      // Audit log activity
      await this.auditService.logActivity({
        userId: input.userId,
        userName: input.userName,
        message: `Replied to thread "${parentConversation.subject}"`,
        context: {
          userId: input.userId,
          organizationId: parentConversation.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
      });

      await this.auditService.logAudit({
        action: "EMAIL_REPLIED",
        message: `Sent reply to conversation: ${parentConversation.id}`,
        context: {
          userId: input.userId,
          organizationId: parentConversation.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
        metadata: {
          messageId: message.id,
          conversationId: parentConversation.id,
        },
      });

      return ok({ messageId: message.id });
    } catch (err) {
      return fail(err instanceof AppError ? err : new AppError(String(err)));
    }
  }

  async forward(
    input: ForwardMailInput,
  ): Promise<Result<{ messageId: string }>> {
    try {
      this.validateRecipients(input.to);

      const originalMessage = await this.messageRepo.findById(
        input.originalMessageId,
      );
      if (!originalMessage) {
        throw new NotFoundError("Original message not found");
      }

      const originalConversation = await this.conversationRepo.findById(
        originalMessage.conversationId,
      );
      if (!originalConversation) {
        throw new NotFoundError("Original conversation not found");
      }

      const account = await this.emailAccountRepo.findById(
        originalConversation.accountId,
      );
      if (!account) {
        throw new NotFoundError("Email account not found");
      }

      const generatedMsgId = this.generateMessageId();
      const forwardedSubject = originalMessage.subject.startsWith("Fwd:")
        ? originalMessage.subject
        : `Fwd: ${originalMessage.subject}`;

      const forwardHeaderHtml = `
        <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-bottom: 20px; color: #555;">
          <p>---------- Forwarded message ---------</p>
          <p>From: <strong>${originalMessage.sender}</strong></p>
          <p>Date: ${originalMessage.createdAt.toLocaleString()}</p>
          <p>Subject: ${originalMessage.subject}</p>
          <p>To: ${originalMessage.recipients.join(", ")}</p>
        </div>
      `;

      const commentedBody = input.comment
        ? `<p>${input.comment}</p><br/>${forwardHeaderHtml}${originalMessage.htmlBody || ""}`
        : `${forwardHeaderHtml}${originalMessage.htmlBody || ""}`;

      const headers = { "Message-ID": generatedMsgId };
      const provider = this.getEmailProvider();

      const sendResult = await provider.send({
        to: input.to,
        subject: forwardedSubject,
        body: commentedBody,
        headers,
      });

      // Create a brand new conversation thread for forwarding
      const conversation = await this.conversationRepo.create({
        organizationId: originalConversation.organizationId,
        accountId: originalConversation.accountId,
        subject: forwardedSubject,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
      });

      // Save forward message
      const message = await this.messageRepo.create({
        conversationId: conversation.id,
        providerMessageId: sendResult.messageId,
        internetMessageId: generatedMsgId,
        direction: MessageDirection.OUTBOUND,
        sender: account.email,
        recipients: input.to,
        cc: [],
        bcc: [],
        subject: forwardedSubject,
        htmlBody: commentedBody,
        deliveryStatus: DeliveryStatus.SENT,
        sentByUserId: input.userId,
      });

      // Audit log activity
      await this.auditService.logActivity({
        userId: input.userId,
        userName: input.userName,
        message: `Forwarded email to ${input.to.join(", ")} with subject "${forwardedSubject}"`,
        context: {
          userId: input.userId,
          organizationId: originalConversation.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
      });

      await this.auditService.logAudit({
        action: "EMAIL_FORWARDED",
        message: `Forwarded message: ${originalMessage.id} to ${input.to.join(", ")}`,
        context: {
          userId: input.userId,
          organizationId: originalConversation.organizationId,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
        metadata: {
          messageId: message.id,
          conversationId: conversation.id,
        },
      });

      return ok({ messageId: message.id });
    } catch (err) {
      return fail(err instanceof AppError ? err : new AppError(String(err)));
    }
  }

  renderTemplate(html: string, variables: Record<string, string>): string {
    let rendered = html;
    for (const [key, val] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      rendered = rendered.replace(pattern, val);
    }
    return rendered;
  }
}
