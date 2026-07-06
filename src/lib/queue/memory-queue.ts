import { QueueProvider, Job, JobProcessor } from "./queue.interface";
import crypto from "crypto";

export class MemoryQueue implements QueueProvider {
  private jobs = new Map<string, Job<unknown>>();
  private processors = new Map<string, JobProcessor<unknown>>();

  async enqueue<T>(
    name: string,
    data: T,
    options?: { maxAttempts?: number },
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      name,
      data,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      status: "queued",
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job as Job<unknown>);

    setTimeout(() => {
      this.processJob(job.id).catch((err) => {
        console.error(
          `[MemoryQueue] Fatal error during processing job ${job.id}:`,
          err,
        );
      });
    }, 0);

    return job;
  }

  registerProcessor<T>(name: string, processor: JobProcessor<T>): void {
    this.processors.set(name, processor as JobProcessor<unknown>);
  }

  async getJob(id: string): Promise<Job<unknown> | null> {
    return this.jobs.get(id) || null;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const processor = this.processors.get(job.name);
    if (!processor) {
      console.warn(
        `[MemoryQueue] No processor registered for job: ${job.name}`,
      );
      return;
    }

    job.status = "processing";
    job.attempts += 1;

    try {
      await processor(job);
      job.status = "completed";
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      job.error = errMsg;

      if (job.attempts < job.maxAttempts) {
        job.status = "queued";
        const delay = job.attempts * 1000;
        setTimeout(() => {
          this.processJob(jobId).catch((err2) => {
            console.error(
              `[MemoryQueue] Fatal error during retrying job ${jobId}:`,
              err2,
            );
          });
        }, delay);
      } else {
        job.status = "failed";
        console.error(
          `[MemoryQueue] Job ${jobId} failed permanently: ${errMsg}`,
        );
      }
    }
  }
}
