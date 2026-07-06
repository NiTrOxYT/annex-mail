import { container } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { EmailAccount } from "@prisma/client";

export class AttachmentService {
  async downloadAndStore(
    account: EmailAccount,
    messageId: string,
    attachmentId: string,
    filename: string,
    orgId: string,
  ): Promise<string> {
    const provider = ProviderRegistry.getProvider(account.provider);
    const importer = provider.getImporter();
    const storage = container.resolve<StorageProvider>("StorageProvider");

    const buffer = await importer.fetchAttachment(
      account,
      messageId,
      attachmentId,
    );

    const storagePath = `orgs/${orgId}/attachments/${attachmentId}_${filename}`;
    await storage.upload(storagePath, buffer);

    return storagePath;
  }
}
export const attachmentService = new AttachmentService();
