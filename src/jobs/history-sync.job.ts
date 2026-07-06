import { container } from "@/lib/di/container";
import { EmailAccountRepository } from "@/repositories/email-account.repository";
import { historyService } from "@/services/history.service";
import { Job } from "@/lib/queue/queue.interface";
import { logger } from "@/lib/logger/logger";

export async function historySyncJob(
  job: Job<{ emailAccountId: string; startHistoryId: string }>,
): Promise<void> {
  const accountRepo = container.resolve<EmailAccountRepository>(
    "EmailAccountRepository",
  );
  const account = await accountRepo.findById(job.data.emailAccountId);

  if (!account) {
    logger.warn(`Account not found for job: ${job.id}`, "historySyncJob");
    return;
  }

  await historyService.processHistorySync(account, job.data.startHistoryId);
}
