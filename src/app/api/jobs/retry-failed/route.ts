import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/di/container";
import { QueueProvider } from "@/lib/queue/queue.interface";
import { DatabaseQueueProvider } from "@/lib/queue/database-queue";
import { logger } from "@/lib/logger/logger";

export const dynamic = "force-dynamic";

function validateCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  try {
    const queue = container.resolve<QueueProvider>("QueueProvider");

    if (!(queue instanceof DatabaseQueueProvider)) {
      return NextResponse.json({
        ok: true,
        message: "Non-DB queue — retry managed in-process",
      });
    }

    await queue.retryFailed(20);

    logger.info("Retry failed cron completed", "CronRetryFailed", {
      duration: Date.now() - started,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("Retry failed cron fatal", "CronRetryFailed", { error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
