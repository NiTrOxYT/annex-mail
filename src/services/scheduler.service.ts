import { db } from "@/lib/db/db";
import { watchService } from "@/services/watch.service";
import { historyService } from "@/services/history.service";
import { container } from "@/lib/di/container";
import { QueueProvider } from "@/lib/queue/queue.interface";
import { DatabaseQueueProvider } from "@/lib/queue/database-queue";
import { logger } from "@/lib/logger/logger";

export interface MaintenanceStepResult {
  step: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: string;
}

export interface MaintenanceSummary {
  status: "success" | "failed" | "degraded";
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  results: MaintenanceStepResult[];
}

export class SchedulerService {
  private async updateMetadata(key: string, value: string): Promise<void> {
    try {
      await db.systemMetadata.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    } catch (err) {
      logger.error(
        `Failed to update metadata for key: ${key}`,
        "SchedulerService",
        {
          error: String(err),
        },
      );
    }
  }

  /**
   * Renew push watch notifications for all active accounts.
   */
  async renewGmailWatch(): Promise<void> {
    const activeAccounts = await db.emailAccount.findMany({
      where: { status: "ACTIVE" },
    });

    for (const account of activeAccounts) {
      await watchService.renewWatchIfExpiring(account);
    }
    await this.updateMetadata("last_watch_renewal", new Date().toISOString());
  }

  /**
   * Retry failed background jobs that have remaining attempts.
   */
  async retryFailedQueueJobs(): Promise<void> {
    const queue = container.resolve<QueueProvider>("QueueProvider");
    if (queue instanceof DatabaseQueueProvider) {
      await queue.retryFailed(20);
    }
    await this.updateMetadata("last_queue_retry", new Date().toISOString());
  }

  /**
   * Run incremental history sync for all active email accounts.
   */
  async runIncrementalHistorySync(): Promise<void> {
    const accounts = await db.emailAccount.findMany({
      where: { status: "ACTIVE" },
    });

    for (const account of accounts) {
      const syncState = await db.syncState.findUnique({
        where: { emailAccountId: account.id },
      });
      if (syncState?.historyId) {
        await historyService.processHistorySync(account, syncState.historyId);
      }
    }
    await this.updateMetadata("last_history_sync", new Date().toISOString());
  }

  /**
   * Cleanup finished queue records older than 30 days.
   */
  async cleanupExpiredQueueRecords(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.jobRecord.deleteMany({
      where: {
        status: { in: ["completed", "failed"] },
        updatedAt: { lt: thirtyDaysAgo },
      },
    });
    await this.updateMetadata("last_queue_cleanup", new Date().toISOString());
  }

  /**
   * Cleanup expired authentication sessions from NextAuth Session table.
   */
  async cleanupExpiredSessions(): Promise<void> {
    await db.session.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    });
    await this.updateMetadata("last_session_cleanup", new Date().toISOString());
  }

  /**
   * Orchestrate all maintenance jobs sequentially.
   * Ensures remaining steps execute even if one fails.
   */
  async runDailyMaintenance(): Promise<MaintenanceSummary> {
    const startedAt = new Date();
    logger.structured("INFO", {
      message: "Daily maintenance run started",
      action: "DAILY_MAINTENANCE_STARTED",
      module: "SchedulerService",
    });

    const steps = [
      {
        name: "renew_watch",
        fn: () => this.renewGmailWatch(),
        successLog: "WATCH_RENEW_SUCCESS",
      },
      {
        name: "retry_failed_jobs",
        fn: () => this.retryFailedQueueJobs(),
        successLog: "QUEUE_RETRY_SUCCESS",
      },
      {
        name: "incremental_sync",
        fn: () => this.runIncrementalHistorySync(),
        successLog: "HISTORY_SYNC_SUCCESS",
      },
      { name: "queue_cleanup", fn: () => this.cleanupExpiredQueueRecords() },
      { name: "session_cleanup", fn: () => this.cleanupExpiredSessions() },
    ];

    const results: MaintenanceStepResult[] = [];

    for (const step of steps) {
      const stepStart = Date.now();
      try {
        await step.fn();
        const durationMs = Date.now() - stepStart;
        results.push({
          step: step.name,
          status: "success",
          durationMs,
        });

        if (step.successLog) {
          logger.structured("INFO", {
            message: `Maintenance step ${step.name} succeeded`,
            action: step.successLog,
            module: "SchedulerService",
            duration: durationMs,
            status: "success",
          });
        }
      } catch (err) {
        const durationMs = Date.now() - stepStart;
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({
          step: step.name,
          status: "failed",
          durationMs,
          error: errMsg,
        });

        logger.error(
          `Maintenance step ${step.name} failed`,
          "SchedulerService",
          {
            error: errMsg,
            duration: durationMs,
          },
        );
      }
    }

    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - startedAt.getTime();
    const hasFailures = results.some((r) => r.status === "failed");
    const status = hasFailures ? "degraded" : "success";

    logger.structured(hasFailures ? "WARN" : "INFO", {
      message: `Daily maintenance run completed with status: ${status}`,
      action: hasFailures
        ? "DAILY_MAINTENANCE_FAILED"
        : "DAILY_MAINTENANCE_COMPLETED",
      module: "SchedulerService",
      duration: totalDurationMs,
      status,
      metadata: { results },
    });

    await this.updateMetadata(
      "last_daily_maintenance",
      completedAt.toISOString(),
    );

    return {
      status,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      totalDurationMs,
      results,
    };
  }
}

export const schedulerService = new SchedulerService();
