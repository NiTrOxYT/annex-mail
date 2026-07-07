import { container } from "@/lib/di/container";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { LabelRepository } from "@/repositories/label.repository";
import { NormalizedMessage } from "@/lib/providers/provider.interface";
import { eventBus } from "@/lib/events/event-bus";
import { db } from "@/lib/db/db";
import { MessageDirection, DeliveryStatus, Prisma } from "@prisma/client";
import crypto from "crypto";

export class ImportService {
  async importMessage(
    emailAccountId: string,
    orgId: string,
    msg: NormalizedMessage,
  ): Promise<{
    status: "imported" | "updated";
    attachmentsCreated: number;
    conversationCreated?: boolean;
  }> {
    const labelRepo = container.resolve<LabelRepository>("LabelRepository");

    const checksumInput = `${msg.providerMessageId}:${
      msg.internetMessageId
    }:${msg.internalDate.getTime()}`;
    const checksum = crypto
      .createHash("sha256")
      .update(checksumInput)
      .digest("hex");

    const existing = await db.message.findFirst({
      where: {
        OR: [
          { providerMessageId: msg.providerMessageId },
          { internetMessageId: msg.internetMessageId },
          { checksum },
        ],
      },
    });

    if (existing) {
      await this.updateMessageFlags(existing.id, msg);
      return { status: "updated", attachmentsCreated: 0 };
    }

    const { id: conversationId, created: conversationCreated } =
      await this.resolveConversationId(emailAccountId, orgId, msg);

    const direction = msg.sender.includes(msg.recipients[0] || "")
      ? MessageDirection.OUTBOUND
      : MessageDirection.INBOUND;

    let sanitizedHtml = null;
    if (msg.htmlBody) {
      const { sanitizeHtml } = await import("@/lib/security/sanitizer");
      sanitizedHtml = sanitizeHtml(msg.htmlBody);
    }

    const created = await db.message.create({
      data: {
        conversationId,
        provider: "gmail",
        providerMessageId: msg.providerMessageId,
        providerThreadId: msg.providerThreadId,
        internetMessageId: msg.internetMessageId,
        threadKey: msg.providerThreadId,
        providerData: msg.headers as Prisma.InputJsonValue,
        snippet: msg.snippet,
        headers: msg.headers as Prisma.InputJsonValue,
        rawSize: msg.rawSize,
        checksum,
        hasAttachments: msg.hasAttachments,
        isRead: msg.isRead,
        isStarred: msg.isStarred,
        isImportant: msg.isImportant,
        isDraft: msg.isDraft,
        internalDate: msg.internalDate,
        inReplyTo: msg.headers?.["In-Reply-To"],
        references: msg.headers?.["References"],
        direction,
        sender: msg.sender,
        recipients: msg.recipients,
        cc: msg.cc,
        bcc: msg.bcc,
        subject: msg.subject,
        htmlBody: sanitizedHtml,
        textBody: msg.textBody,
        deliveryStatus: DeliveryStatus.DELIVERED,
      },
    });

    // Handle Label associations
    for (const labelName of msg.labels) {
      let label = await labelRepo.findByName(orgId, labelName);
      if (!label) {
        label = await labelRepo.create({
          organizationId: orgId,
          name: labelName,
          providerId: labelName,
        });
      }
      await labelRepo.applyLabelToMessage(created.id, label.id);
    }

    // Attachments tracking
    let attachmentsCreated = 0;
    if (msg.attachments) {
      for (const att of msg.attachments) {
        await db.attachment.create({
          data: {
            messageId: created.id,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            storageProvider: "LocalStorageProvider",
            storagePath: `orgs/${orgId}/attachments/${att.providerAttachmentId}_${att.filename}`,
          },
        });
        attachmentsCreated++;
      }
    }

    await eventBus.publish({
      name: "MESSAGE_IMPORTED",
      timestamp: new Date(),
      payload: { messageId: created.id, conversationId, organizationId: orgId },
    });

    return { status: "imported", attachmentsCreated, conversationCreated };
  }

  private async updateMessageFlags(
    messageId: string,
    msg: NormalizedMessage,
  ): Promise<void> {
    await db.message.update({
      where: { id: messageId },
      data: {
        isRead: msg.isRead,
        isStarred: msg.isStarred,
        isImportant: msg.isImportant,
        isDraft: msg.isDraft,
      },
    });

    await eventBus.publish({
      name: "MESSAGE_UPDATED",
      timestamp: new Date(),
      payload: { messageId },
    });
  }

  private async resolveConversationId(
    emailAccountId: string,
    orgId: string,
    msg: NormalizedMessage,
  ): Promise<{ id: string; created: boolean }> {
    const conversationRepo = container.resolve<ConversationRepository>(
      "ConversationRepository",
    );

    // 1. ThreadId match
    if (msg.providerThreadId) {
      const existingMsg = await db.message.findFirst({
        where: {
          providerThreadId: msg.providerThreadId,
          conversation: { accountId: emailAccountId },
        },
        select: { conversationId: true },
      });
      if (existingMsg) {
        return { id: existingMsg.conversationId, created: false };
      }
    }

    // 2. References matching
    const refs: string[] = [];
    if (msg.headers?.["In-Reply-To"]) refs.push(msg.headers["In-Reply-To"]);
    if (msg.headers?.["References"]) {
      msg.headers["References"].split(/\s+/).forEach((ref) => {
        if (ref.startsWith("<") && ref.endsWith(">")) {
          refs.push(ref);
        }
      });
    }

    if (refs.length > 0) {
      const relatedMsg = await db.message.findFirst({
        where: {
          internetMessageId: { in: refs },
          conversation: { accountId: emailAccountId },
        },
        select: { conversationId: true },
      });
      if (relatedMsg) {
        return { id: relatedMsg.conversationId, created: false };
      }
    }

    // 3. Subject matching
    const cleanSubject = msg.subject.replace(/^(Re|Fwd):\s*/i, "").trim();
    const cleanSubjectMsg = await db.message.findFirst({
      where: {
        subject: { contains: cleanSubject },
        conversation: { accountId: emailAccountId },
      },
      select: { conversationId: true },
    });

    if (cleanSubjectMsg) {
      return { id: cleanSubjectMsg.conversationId, created: false };
    }

    // 4. Create new thread
    const conversation = await conversationRepo.create({
      organizationId: orgId,
      accountId: emailAccountId,
      subject: msg.subject,
      threadKey: msg.providerThreadId,
    });

    return { id: conversation.id, created: true };
  }
}
export const importService = new ImportService();
