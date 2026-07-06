import { container } from "@/lib/di/container";
import { SyncStateRepository } from "@/repositories/sync-state.repository";
import { ProviderRegistry } from "@/lib/providers/provider.registry";
import { importService } from "./import.service";
import { labelService } from "./label.service";
import { watchService } from "./watch.service";
import { gmailClient } from "@/lib/providers/gmail/gmail.client";
import { EmailAccount } from "@prisma/client";
import { logger } from "@/lib/logger/logger";
import { eventBus } from "@/lib/events/event-bus";

export class SyncService {
  async initialSync(account: EmailAccount): Promise<void> {
    const syncRepo = container.resolve<SyncStateRepository>(
      "SyncStateRepository",
    );
    logger.info(
      `Starting initial mailbox sync for: ${account.email}`,
      "SyncService",
    );

    await eventBus.publish({
      name: "SYNC_STARTED",
      timestamp: new Date(),
      payload: { emailAccountId: account.id },
    });

    try {
      await labelService.syncLabels(account);

      const provider = ProviderRegistry.getProvider(account.provider);
      const importer = provider.getImporter();
      const normalizer = provider.getNormalizer();

      const res = await gmailClient.fetchWithAuth(
        account,
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
      );

      let messages: { id: string; threadId: string }[] = [];
      let historyId = "1000";

      if (res.ok) {
        const data = (await res.json()) as {
          simulated?: boolean;
          messages?: { id: string; threadId: string }[];
        };
        if (data.simulated) {
          messages = [
            { id: "sim_msg1", threadId: "sim_thread1" },
            { id: "sim_msg2", threadId: "sim_thread2" },
          ];
        } else {
          messages = data.messages || [];
        }
      } else {
        throw new Error(`Failed to fetch initial message list: ${res.status}`);
      }

      for (const msg of messages) {
        try {
          const rawMessage = await importer.fetchMessage(account, msg.id);
          const normalized = await normalizer.normalizeMessage(rawMessage);

          const raw = rawMessage as { historyId?: string };
          if (raw.historyId) {
            historyId = raw.historyId;
          }

          await importService.importMessage(
            account.id,
            account.organizationId,
            normalized,
          );
        } catch (fetchErr) {
          logger.error(`Failed to import message ${msg.id}`, "SyncService", {
            error: String(fetchErr),
          });
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

      await watchService.setupWatch(account);

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
export const syncService = new SyncService();
