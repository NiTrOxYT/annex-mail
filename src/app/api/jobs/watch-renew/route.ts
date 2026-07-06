import { NextRequest, NextResponse } from "next/server";
import { watchService } from "@/services/watch.service";
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
  const results: { accountId: string; status: string; error?: string }[] = [];

  try {
    const { db } = await import("@/lib/db/db");
    const accounts = await db.emailAccount.findMany({
      where: { status: "ACTIVE" },
    });

    for (const account of accounts) {
      try {
        await watchService.renewWatchIfExpiring(account);
        results.push({ accountId: account.id, status: "success" });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({ accountId: account.id, status: "error", error });
        logger.error("Watch renew failed", "CronWatchRenew", {
          accountId: account.id,
          error,
        });
      }
    }

    logger.info("Watch renew cron completed", "CronWatchRenew", {
      duration: Date.now() - started,
      processed: results.length,
    });

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("Watch renew cron fatal", "CronWatchRenew", { error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
