import { container } from "@/lib/di/container";
import { WatchStateRepository } from "@/repositories/watch-state.repository";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { EmailAccount } from "@prisma/client";
import { logger } from "@/lib/logger/logger";
import { eventBus } from "@/lib/events/event-bus";
import { AuditService } from "@/lib/audit/audit.service";

export class WatchService {
  async setupWatch(account: EmailAccount): Promise<void> {
    const watchRepo = container.resolve<WatchStateRepository>(
      "WatchStateRepository",
    );
    const provider = ProviderRegistry.getProvider(account.provider);
    const watcher = provider.getWatcher();
    const audit = container.resolve<AuditService>("AuditService");

    logger.info(
      `Setting up watch for account: ${account.email}`,
      "WatchService",
    );

    try {
      const { resourceId, expiration } = await watcher.watch(account);

      await watchRepo
        .update(account.id, {
          expiration,
          resourceId,
        })
        .catch(async () => {
          await watchRepo.create({
            emailAccountId: account.id,
            expiration,
            resourceId,
          });
        });

      await audit.logAudit({
        action: "WATCH_CREATED",
        message: `Gmail push watch registered for ${account.email}`,
        context: {
          userId: "SYSTEM",
          organizationId: account.organizationId,
        },
        metadata: {
          resourceId,
          expiration: expiration.toISOString(),
        },
      });

      await eventBus.publish({
        name: "WATCH_CREATED",
        timestamp: new Date(),
        payload: { emailAccountId: account.id, resourceId, expiration },
      });
    } catch (err) {
      logger.error(
        `Watch setup failed for account: ${account.email}`,
        "WatchService",
        {
          error: String(err),
        },
      );

      await audit
        .logAudit({
          action: "WATCH_FAILED",
          message: `Gmail watch setup failed for ${account.email}`,
          context: {
            userId: "SYSTEM",
            organizationId: account.organizationId,
          },
          metadata: {
            error: String(err),
          },
        })
        .catch(() => {});

      throw err;
    }
  }

  async renewWatchIfExpiring(account: EmailAccount): Promise<void> {
    const watchRepo = container.resolve<WatchStateRepository>(
      "WatchStateRepository",
    );
    const audit = container.resolve<AuditService>("AuditService");
    const active = await watchRepo.findByEmailAccountId(account.id);
    if (!active) {
      await this.setupWatch(account);
      return;
    }

    const oneDay = 24 * 60 * 60 * 1000;
    if (active.expiration.getTime() - Date.now() < oneDay) {
      logger.info(
        `Renewing watch for account: ${account.email}`,
        "WatchService",
      );
      await this.setupWatch(account);

      await audit.logAudit({
        action: "WATCH_RENEWED",
        message: `Gmail watch renewed for ${account.email}`,
        context: {
          userId: "SYSTEM",
          organizationId: account.organizationId,
        },
      });

      await eventBus.publish({
        name: "WATCH_RENEWED",
        timestamp: new Date(),
        payload: { emailAccountId: account.id },
      });
    }
  }

  async stopWatch(account: EmailAccount): Promise<void> {
    const watchRepo = container.resolve<WatchStateRepository>(
      "WatchStateRepository",
    );
    const provider = ProviderRegistry.getProvider(account.provider);
    const watcher = provider.getWatcher();

    await watcher.stop(account);
    await watchRepo.delete(account.id).catch(() => {});
  }
}
export const watchService = new WatchService();
