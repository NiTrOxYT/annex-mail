import { container } from "@/lib/di/container";
import { WatchStateRepository } from "@/repositories/watch-state.repository";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { EmailAccount } from "@prisma/client";
import { logger } from "@/lib/logger/logger";
import { eventBus } from "@/lib/events/event-bus";

export class WatchService {
  async setupWatch(account: EmailAccount): Promise<void> {
    const watchRepo = container.resolve<WatchStateRepository>(
      "WatchStateRepository",
    );
    const provider = ProviderRegistry.getProvider(account.provider);
    const watcher = provider.getWatcher();

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
      throw err;
    }
  }

  async renewWatchIfExpiring(account: EmailAccount): Promise<void> {
    const watchRepo = container.resolve<WatchStateRepository>(
      "WatchStateRepository",
    );
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
