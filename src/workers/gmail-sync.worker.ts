import { container } from "@/lib/di/container";
import { QueueProvider } from "@/lib/queue/queue.interface";
import { historySyncJob } from "@/jobs/history-sync.job";
import { watchRenewJob } from "@/jobs/watch-renew.job";
import { logger } from "@/lib/logger/logger";

export class GmailSyncWorker {
  static init() {
    logger.info(
      "Initializing GmailSyncWorker processors...",
      "GmailSyncWorker",
    );
    const queue = container.resolve<QueueProvider>("QueueProvider");

    queue.registerProcessor("history-sync", historySyncJob);
    queue.registerProcessor("watch-renew", watchRenewJob);
  }
}
