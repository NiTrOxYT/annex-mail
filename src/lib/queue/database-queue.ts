import { db } from "@/lib/db/db";
import { QueueProvider, Job, JobProcessor } from "./queue.interface";
import crypto from "crypto";

export class DatabaseQueueProvider implements QueueProvider {
  private processors = new Map<string, JobProcessor<unknown>>();

  async enqueue<T>(
    name: string,
    data: T,
    options?: { maxAttempts?: number },
  ): Promise<Job<T>> {
    const record = await db.jobRecord.create({
      data: {
        id: crypto.randomUUID(),
        name,
        data: data as object,
        maxAttempts: options?.maxAttempts ?? 3,
        status: "queued",
      },
    });

    return {
      id: record.id,
      name: record.name,
      data: record.data as T,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      status: record.status as Job["status"],
      error: record.error ?? undefined,
      createdAt: record.createdAt,
    };
  }

  registerProcessor<T>(name: string, processor: JobProcessor<T>): void {
    this.processors.set(name, processor as JobProcessor<unknown>);
  }

  async getJob(id: string): Promise<Job<unknown> | null> {
    const record = await db.jobRecord.findUnique({ where: { id } });
    if (!record) return null;

    return {
      id: record.id,
      name: record.name,
      data: record.data,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      status: record.status as Job["status"],
      error: record.error ?? undefined,
      createdAt: record.createdAt,
    };
  }

  /**
   * Called by cron endpoints to drain pending jobs for a given job name.
   * Runs up to `limit` jobs sequentially.
   */
  async drainQueue(name: string, limit = 10): Promise<void> {
    const records = await db.jobRecord.findMany({
      where: { name, status: "queued" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    for (const record of records) {
      await this.runJob(record.id);
    }
  }

  async retryFailed(limit = 20): Promise<void> {
    const records = await db.jobRecord.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    for (const record of records) {
      if (record.attempts < record.maxAttempts) {
        await db.jobRecord.update({
          where: { id: record.id },
          data: { status: "queued" },
        });
        await this.runJob(record.id);
      }
    }
  }

  private async runJob(id: string): Promise<void> {
    const record = await db.jobRecord.findUnique({ where: { id } });
    if (!record || record.status === "processing") return;

    const processor = this.processors.get(record.name);
    if (!processor) return;

    await db.jobRecord.update({
      where: { id },
      data: { status: "processing", attempts: { increment: 1 } },
    });

    const job: Job<unknown> = {
      id: record.id,
      name: record.name,
      data: record.data,
      attempts: record.attempts + 1,
      maxAttempts: record.maxAttempts,
      status: "processing",
      createdAt: record.createdAt,
    };

    try {
      await processor(job);
      await db.jobRecord.update({
        where: { id },
        data: { status: "completed" },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = record.attempts + 1;
      await db.jobRecord.update({
        where: { id },
        data: {
          status: newAttempts >= record.maxAttempts ? "failed" : "queued",
          error: errMsg,
        },
      });
    }
  }
}
