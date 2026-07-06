import { container } from "./container";
import { UserRepository } from "@/repositories/user.repository";
import { OrgRepository } from "@/repositories/org.repository";
import { EmailAccountRepository } from "@/repositories/email-account.repository";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageRepository } from "@/repositories/message.repository";
import { DraftRepository } from "@/repositories/draft.repository";
import { TemplateRepository } from "@/repositories/template.repository";
import { SyncStateRepository } from "@/repositories/sync-state.repository";
import { WatchStateRepository } from "@/repositories/watch-state.repository";
import { LabelRepository } from "@/repositories/label.repository";
import { UserService } from "@/services/user.service";
import { MailService } from "@/services/mail.service";
import { logger } from "@/lib/logger/logger";
import { MemoryCacheProvider } from "@/lib/cache/memory-cache";
import { LocalStorageProvider } from "@/lib/storage/local-storage";
import { SupabaseStorageProvider } from "@/lib/storage/supabase-storage";
import { MemoryQueue } from "@/lib/queue/memory-queue";
import { DatabaseQueueProvider } from "@/lib/queue/database-queue";
import { EmailProviderFactory } from "@/lib/email/provider.factory";
import { AuditService } from "@/lib/audit/audit.service";
import { storageConfig } from "@/config/storage";

export function registerDependencies() {
  container.register("UserRepository", new UserRepository());
  container.register("OrgRepository", new OrgRepository());
  container.register("EmailAccountRepository", new EmailAccountRepository());
  container.register("ConversationRepository", new ConversationRepository());
  container.register("MessageRepository", new MessageRepository());
  container.register("DraftRepository", new DraftRepository());
  container.register("TemplateRepository", new TemplateRepository());
  container.register("SyncStateRepository", new SyncStateRepository());
  container.register("WatchStateRepository", new WatchStateRepository());
  container.register("LabelRepository", new LabelRepository());
  container.register("UserService", new UserService());
  container.register("MailService", new MailService());
  container.register("Logger", logger);
  container.register("CacheProvider", new MemoryCacheProvider());
  container.register("AuditService", new AuditService());
  container.register("EmailProvider", EmailProviderFactory.getProvider());

  // Storage: supabase in production, local in development
  const storage =
    storageConfig.provider === "supabase"
      ? new SupabaseStorageProvider()
      : new LocalStorageProvider();
  container.register("StorageProvider", storage);

  // Queue: database in production, memory in development
  const queue =
    process.env.NODE_ENV === "production"
      ? new DatabaseQueueProvider()
      : new MemoryQueue();
  container.register("QueueProvider", queue);
}
