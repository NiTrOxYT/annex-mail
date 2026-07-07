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
import { QueueProvider } from "@/lib/queue/queue.interface";

export interface SyncSummary {
  messagesImported: number;
  conversationsImported: number;
  attachmentsImported: number;
  durationMs: number;
  errors: string[];
}

export class SyncService {
  async initialSync(account: EmailAccount): Promise<SyncSummary> {
    const startTime = Date.now();
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

    const summary: SyncSummary = {
      messagesImported: 0,
      conversationsImported: 0,
      attachmentsImported: 0,
      durationMs: 0,
      errors: [],
    };

    try {
      await labelService.syncLabels(account);

      const provider = ProviderRegistry.getProvider(account.provider);
      const importer = provider.getImporter();
      const normalizer = provider.getNormalizer();

      let messages: { id: string; threadId: string }[] = [];
      let historyId = "1000";
      let nextPageToken: string | undefined = undefined;
      let pagesFetched = 0;
      const maxPages = 5; // Sync up to 100 messages for initial/manual sync limits

      do {
        const tokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
        const res = await gmailClient.fetchWithAuth(
          account,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20${tokenParam}`,
        );

        if (res.ok) {
          const data = (await res.json()) as {
            simulated?: boolean;
            messages?: { id: string; threadId: string }[];
            nextPageToken?: string;
          };
          if (data.simulated) {
            messages = [
              { id: "sim_msg1", threadId: "sim_thread1" },
              { id: "sim_msg2", threadId: "sim_thread2" },
            ];
            break;
          } else {
            if (data.messages) {
              messages.push(...data.messages);
            }
            nextPageToken = data.nextPageToken;
          }
        } else {
          const text = await res.text();
          throw new Error(
            `Failed to fetch initial message list: ${res.status} - ${text}`,
          );
        }
        pagesFetched++;
      } while (nextPageToken && pagesFetched < maxPages);

      for (const msg of messages) {
        try {
          const rawMessage = await importer.fetchMessage(account, msg.id);
          const normalized = await normalizer.normalizeMessage(rawMessage);

          const raw = rawMessage as { historyId?: string };
          if (raw.historyId) {
            historyId = raw.historyId;
          }

          const importResult = await importService.importMessage(
            account.id,
            account.organizationId,
            normalized,
          );

          if (importResult.status === "imported") {
            summary.messagesImported++;
            if (importResult.conversationCreated) {
              summary.conversationsImported++;
            }
            summary.attachmentsImported += importResult.attachmentsCreated;
          }
        } catch (fetchErr) {
          const errMsg = String(fetchErr);
          summary.errors.push(`Message ${msg.id}: ${errMsg}`);
          logger.error(`Failed to import message ${msg.id}`, "SyncService", {
            error: errMsg,
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

      try {
        await watchService.setupWatch(account);
      } catch (watchErr) {
        logger.error(
          `Gmail watch setup failed during initialSync for ${account.email}, scheduling watch-renew retry job.`,
          "SyncService",
          { error: String(watchErr) },
        );
        try {
          const queue = container.resolve<QueueProvider>("QueueProvider");
          await queue.enqueue(
            "watch-renew",
            { emailAccountId: account.id },
            { maxAttempts: 5 },
          );
          logger.info(
            `Scheduled "watch-renew" retry job for ${account.email}`,
            "SyncService",
          );
        } catch (enqueueErr) {
          logger.error(
            `Failed to enqueue "watch-renew" retry job`,
            "SyncService",
            { error: String(enqueueErr) },
          );
        }
      }

      summary.durationMs = Date.now() - startTime;

      await eventBus.publish({
        name: "SYNC_COMPLETED",
        timestamp: new Date(),
        payload: { emailAccountId: account.id, historyId },
      });

      return summary;
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
