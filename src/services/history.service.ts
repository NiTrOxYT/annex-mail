import { container } from "@/lib/di/container";
import { SyncStateRepository } from "@/repositories/sync-state.repository";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { importService } from "./import.service";
import { EmailAccount } from "@prisma/client";
import { logger } from "@/lib/logger/logger";
import { eventBus } from "@/lib/events/event-bus";

export class HistoryService {
  async processHistorySync(
    account: EmailAccount,
    startHistoryId: string,
  ): Promise<void> {
    const syncRepo = container.resolve<SyncStateRepository>(
      "SyncStateRepository",
    );
    const provider = ProviderRegistry.getProvider(account.provider);
    const historyProvider = provider.getHistoryProvider();
    const importer = provider.getImporter();
    const normalizer = provider.getNormalizer();

    logger.info(
      `Starting incremental history sync for ${account.email} from historyId: ${startHistoryId}`,
      "HistoryService",
    );

    await eventBus.publish({
      name: "SYNC_STARTED",
      timestamp: new Date(),
      payload: { emailAccountId: account.id },
    });

    try {
      const { historyId, changes } = await historyProvider.listHistory(
        account,
        startHistoryId,
      );

      for (const change of changes) {
        if (change.type === "added") {
          try {
            const rawMessage = await importer.fetchMessage(
              account,
              change.messageId,
            );
            const normalized = await normalizer.normalizeMessage(rawMessage);
            await importService.importMessage(
              account.id,
              account.organizationId,
              normalized,
            );
          } catch (fetchErr) {
            logger.error(
              `Failed to import message ${change.messageId}`,
              "HistoryService",
              {
                error: String(fetchErr),
              },
            );
          }
        }
      }

      await syncRepo
        .update(account.id, {
          historyId,
          lastSuccessfulSync: new Date(),
          status: "IDLE",
        })
        .catch(async () => {
          await syncRepo.create({
            emailAccountId: account.id,
            historyId,
            lastSuccessfulSync: new Date(),
            status: "IDLE",
          });
        });

      await eventBus.publish({
        name: "SYNC_COMPLETED",
        timestamp: new Date(),
        payload: { emailAccountId: account.id, historyId },
      });
    } catch (err) {
      await syncRepo.update(account.id, { status: "FAILED" }).catch(() => {});

      await eventBus.publish({
        name: "SYNC_FAILED",
        timestamp: new Date(),
        payload: { emailAccountId: account.id, error: String(err) },
      });

      throw err;
    }
  }
}
export const historyService = new HistoryService();
