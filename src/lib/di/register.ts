/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import { EmailProviderFactory } from "@/lib/email/provider.factory";
import { AuditService } from "@/lib/audit/audit.service";
import { StorageFactory } from "@/lib/storage/storage.factory";

export async function registerDependencies() {
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

  // Storage: resolved dynamically via factory to prevent local filesystem tracing in production builds
  const storage = await StorageFactory.getProvider();
  container.register("StorageProvider", storage);

  // Queue: database in production, memory in development (loaded lazily)
  let queue;
  if (process.env.NODE_ENV === "production") {
    const { DatabaseQueueProvider } = await import("../queue/database-queue");
    queue = new DatabaseQueueProvider();
  } else {
    // Dynamic import with ignore comment prevents Turbopack from tracing memory-queue in production builds
    // @ts-ignore
    const { MemoryQueue } = await import(
      /* turbopackIgnore: true */ "../queue/memory-queue"
    );
    queue = new MemoryQueue();
  }
  container.register("QueueProvider", queue);

  // Rate Limiter: database-backed by default, Upstash Redis if configured (loaded lazily)
  let rateLimiter;
  if (process.env.RATE_LIMIT_PROVIDER === "upstash") {
    // @ts-ignore
    const { UpstashRateLimiterProvider } = await import(
      /* turbopackIgnore: true */ "@/lib/security/upstash-rate-limiter"
    );
    rateLimiter = new UpstashRateLimiterProvider();
  } else {
    const { DatabaseRateLimiterProvider } =
      await import("@/lib/security/database-rate-limiter");
    rateLimiter = new DatabaseRateLimiterProvider();
  }
  container.register("RateLimiterProvider", rateLimiter);
}
