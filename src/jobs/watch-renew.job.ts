import { container } from "@/lib/di/container";
import { EmailAccountRepository } from "@/repositories/email-account.repository";
import { watchService } from "@/services/watch.service";
import { Job } from "@/lib/queue/queue.interface";
import { logger } from "@/lib/logger/logger";

export async function watchRenewJob(
  job: Job<{ emailAccountId: string }>,
): Promise<void> {
  const accountRepo = container.resolve<EmailAccountRepository>(
    "EmailAccountRepository",
  );
  const account = await accountRepo.findById(job.data.emailAccountId);

  if (!account) {
    logger.warn(`Account not found for job: ${job.id}`, "watchRenewJob");
    return;
  }

  await watchService.renewWatchIfExpiring(account);
}
