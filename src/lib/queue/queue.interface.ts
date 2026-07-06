export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: Date;
}

export type JobProcessor<T = unknown> = (job: Job<T>) => Promise<void>;

export interface QueueProvider {
  enqueue<T>(
    name: string,
    data: T,
    options?: { maxAttempts?: number },
  ): Promise<Job<T>>;
  registerProcessor<T>(name: string, processor: JobProcessor<T>): void;
  getJob(id: string): Promise<Job<unknown> | null>;
}
